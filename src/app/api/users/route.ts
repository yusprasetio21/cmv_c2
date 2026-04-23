import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

// Fungsi helper untuk truncate string
const truncateString = (str: string, maxLength: number) => {
  if (!str) return str;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
};

type HouseInfo = {
  nomorRumah: string;
  blok: string;
  statusRumah: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const organizationId = searchParams.get("organization_id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Parameter organization_id wajib diisi" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("users")
      .select(
        "id, username, nama_lengkap, role, rumah_id, rt_number, rw_number, created_at, organization_id",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (role) {
      query = query.eq("role", role);
    }

    if (search) {
      query = query.or(
        `nama_lengkap.ilike.%${search}%,username.ilike.%${search}%`,
      );
    }

    const { data: users, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const rumahIds = users
      .filter((u: { rumah_id: string | null }) => u.rumah_id)
      .map((u: { rumah_id: string }) => u.rumah_id);

    let houseMap = new Map<string, HouseInfo>();
    if (rumahIds.length > 0) {
      const uuidIds = rumahIds.filter((id: string) => isUuid(id));
      if (uuidIds.length > 0) {
        const { data: housesById, error: housesByIdError } = await supabase
          .from("houses")
          .select("id, nomor_rumah, blok, status_rumah")
          .in("id", uuidIds);

        if (housesByIdError) {
          return NextResponse.json(
            { error: housesByIdError.message },
            { status: 500 },
          );
        }

        if (housesById) {
          for (const h of housesById) {
            houseMap.set(h.id, {
              nomorRumah: h.nomor_rumah,
              blok: h.blok,
              statusRumah: h.status_rumah,
            });
          }
        }
      }

      const unresolvedIds = rumahIds.filter((id: string) => !houseMap.has(id));
      if (unresolvedIds.length > 0) {
        const { data: housesByNumber, error: housesByNumberError } =
          await supabase
            .from("houses")
            .select("nomor_rumah, blok, status_rumah")
            .in("nomor_rumah", unresolvedIds);

        if (housesByNumberError) {
          return NextResponse.json(
            { error: housesByNumberError.message },
            { status: 500 },
          );
        }

        if (housesByNumber) {
          for (const h of housesByNumber) {
            houseMap.set(h.nomor_rumah, {
              nomorRumah: h.nomor_rumah,
              blok: h.blok,
              statusRumah: h.status_rumah,
            });
          }
        }
      }
    }

    const result = users.map(
      (u: {
        id: string;
        username: string;
        nama_lengkap: string;
        role: string;
        rumah_id: string | null;
        rt_number: string | null;
        rw_number: string | null;
        created_at: string;
      }) => ({
        id: u.id,
        username: u.username,
        namaLengkap: u.nama_lengkap,
        role: u.role,
        rumahId: u.rumah_id,
        rtNumber: u.rt_number,
        rwNumber: u.rw_number,
        house: u.rumah_id ? houseMap.get(u.rumah_id) || null : null,
        createdAt: u.created_at,
      }),
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      username,
      password,
      nama_lengkap,
      namaLengkap,
      role,
      rumah_id,
      rumahId,
      organization_id,
      organizationId,
    } = body;

    const nama = namaLengkap || nama_lengkap;
    const houseId = rumahId || rumah_id;
    const orgId = organizationId || organization_id;

    if (!username || !password || !nama || !role) {
      return NextResponse.json(
        { error: "Username, password, nama lengkap, dan role wajib diisi" },
        { status: 400 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "organization_id wajib diisi" },
        { status: 400 },
      );
    }

    // TRUNCATE DATA - FIX FOR "value too long" error
    const truncatedUsername = truncateString(username, 20);
    const truncatedNama = truncateString(nama, 50);

    // If username was truncated, show warning
    if (truncatedUsername !== username) {
      console.warn(
        `Username truncated from ${username.length} to 20 chars: ${truncatedUsername}`,
      );
    }
    if (truncatedNama !== nama) {
      console.warn(
        `Nama lengkap truncated from ${nama.length} to 50 chars: ${truncatedNama}`,
      );
    }

    // Check if username already exists in the same organization
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", truncatedUsername)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Username sudah digunakan di organisasi ini" },
        { status: 409 },
      );
    }

    // If houseId provided, verify the house exists and resolve to UUID
    let resolvedHouseId: string | null = null;
    if (houseId) {
      let houseExists: { id: string } | null = null;

      if (isUuid(houseId)) {
        const { data: houseById, error: houseByIdError } = await supabase
          .from("houses")
          .select("id")
          .eq("id", houseId)
          .maybeSingle();

        if (houseByIdError) {
          return NextResponse.json(
            { error: houseByIdError.message },
            { status: 500 },
          );
        }

        houseExists = houseById;
      }

      if (!houseExists) {
        const { data: houseByNumber, error: houseByNumberError } =
          await supabase
            .from("houses")
            .select("id")
            .eq("nomor_rumah", houseId)
            .maybeSingle();

        if (houseByNumberError) {
          return NextResponse.json(
            { error: houseByNumberError.message },
            { status: 500 },
          );
        }

        houseExists = houseByNumber;
      }

      if (!houseExists) {
        return NextResponse.json(
          { error: "Rumah tidak ditemukan" },
          { status: 404 },
        );
      }

      // Gunakan UUID asli dari database (bisa panjang > 20 karakter)
      resolvedHouseId = houseExists.id;
    }

    // Insert with truncated data
    const { data, error } = await supabase
      .from("users")
      .insert({
        username: truncatedUsername,
        password,
        nama_lengkap: truncatedNama,
        role,
        rumah_id: resolvedHouseId,
        organization_id: orgId,
      })
      .select(
        "id, username, nama_lengkap, role, rumah_id, created_at, organization_id",
      )
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get house info if rumah_id exists
    let house: HouseInfo | null = null;
    if (data.rumah_id) {
      const { data: houseData, error: houseDataError } = await supabase
        .from("houses")
        .select("id, nomor_rumah, blok, status_rumah")
        .or(`id.eq.${data.rumah_id},nomor_rumah.eq.${data.rumah_id}`)
        .maybeSingle();

      if (houseDataError) {
        console.error("Error fetching house:", houseDataError);
        return NextResponse.json(
          { error: houseDataError.message },
          { status: 500 },
        );
      }

      if (houseData) {
        house = {
          nomorRumah: houseData.nomor_rumah,
          blok: houseData.blok,
          statusRumah: houseData.status_rumah,
        };
      }
    }

    return NextResponse.json(
      {
        id: data.id,
        username: data.username,
        namaLengkap: data.nama_lengkap,
        role: data.role,
        rumahId: data.rumah_id,
        house: house,
        createdAt: data.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
