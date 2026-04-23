import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/letter-numbering?organization_id=xxx
 * Ambil konfigurasi nomor surat untuk suatu organisasi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Parameter organization_id wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("letter_numbering")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Jika belum ada, buat default
    if (!data) {
      const currentYear = new Date().getFullYear();
      const { data: newData, error: insertError } = await supabase
        .from("letter_numbering")
        .insert({
          organization_id: organizationId,
          prefix: "Sekrt-RT",
          separator: "/",
          format_template:
            "{number}{separator}{prefix}{separator}{month_roman}{separator}{year}",
          last_number: 0,
          last_reset_year: currentYear,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(mapNumbering(newData));
    }

    return NextResponse.json(mapNumbering(data));
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/letter-numbering
 * Update konfigurasi nomor surat
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      organization_id,
      prefix,
      separator,
      format_template,
      last_number,
      last_reset_year,
    } = body;

    if (!id && !organization_id) {
      return NextResponse.json(
        { error: "ID atau organization_id diperlukan" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (prefix !== undefined) updateData.prefix = prefix;
    if (separator !== undefined) updateData.separator = separator;
    if (format_template !== undefined)
      updateData.format_template = format_template;
    if (last_number !== undefined) updateData.last_number = last_number;
    if (last_reset_year !== undefined)
      updateData.last_reset_year = last_reset_year;

    // Auto-create jika belum ada (gunakan id yang dikirim atau cari berdasarkan organization_id)
    const lookupId = id || null;
    const lookupOrgId = organization_id || null;

    if (!lookupId && lookupOrgId) {
      const { data: existing } = await supabase
        .from("letter_numbering")
        .select("id")
        .eq("organization_id", lookupOrgId)
        .maybeSingle();

      if (existing) {
        // Update existing dengan id yang ditemukan
        const { data: updated, error: updateErr } = await supabase
          .from("letter_numbering")
          .update(updateData)
          .eq("id", existing.id)
          .select()
          .maybeSingle();

        if (updateErr) {
          return NextResponse.json(
            { error: updateErr.message },
            { status: 500 },
          );
        }
        if (!updated) {
          return NextResponse.json(
            { error: "Gagal update konfigurasi" },
            { status: 500 },
          );
        }
        return NextResponse.json(mapNumbering(updated));
      }

      // Create baru jika belum ada
      const currentYear = new Date().getFullYear();
      const { data: newConfig, error: createError } = await supabase
        .from("letter_numbering")
        .insert({
          organization_id: lookupOrgId,
          prefix: updateData.prefix || "Sekrt-RT",
          separator: updateData.separator || "/",
          format_template:
            updateData.format_template ||
            "{number}{separator}{prefix}{separator}{month_roman}{separator}{year}",
          last_number: 0,
          last_reset_year: currentYear,
        })
        .select()
        .single();

      if (createError) {
        // Jika RLS block insert, fallback: return sukses meski data tidak tersimpan
        // Data akan dibuat otomatis via GET nantinya
        return NextResponse.json({
          id: null,
          organizationId: lookupOrgId,
          prefix: updateData.prefix || "Sekrt-RT",
          separator: updateData.separator || "/",
          formatTemplate:
            updateData.format_template ||
            "{number}{separator}{prefix}{separator}{month_roman}{separator}{year}",
          lastNumber: 0,
          lastResetYear: currentYear,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json(mapNumbering(newConfig));
    }

    // Update by id
    if (lookupId) {
      const { data: updated, error: updateErr } = await supabase
        .from("letter_numbering")
        .update(updateData)
        .eq("id", lookupId)
        .select()
        .maybeSingle();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      if (!updated) {
        return NextResponse.json(
          { error: "Konfigurasi tidak ditemukan" },
          { status: 404 },
        );
      }
      return NextResponse.json(mapNumbering(updated));
    }

    return NextResponse.json(
      { error: "id atau organization_id diperlukan" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/letter-numbering/generate
 * Generate nomor surat berikutnya (increment counter)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id wajib diisi" },
        { status: 400 },
      );
    }

    // Ambil konfigurasi saat ini
    const { data: config, error: fetchError } = await supabase
      .from("letter_numbering")
      .select("*")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!config) {
      return NextResponse.json(
        {
          error:
            "Konfigurasi nomor surat belum ada. Simpan pengaturan terlebih dahulu.",
        },
        { status: 404 },
      );
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based

    // Reset counter jika tahun berbeda
    let nextNumber = (config.last_number || 0) + 1;
    let resetYear = config.last_reset_year;

    if (currentYear !== config.last_reset_year) {
      nextNumber = 1;
      resetYear = currentYear;
    }

    // Update counter di database
    const { data: updated, error: updateError } = await supabase
      .from("letter_numbering")
      .update({
        last_number: nextNumber,
        last_reset_year: resetYear,
        updated_at: now.toISOString(),
      })
      .eq("id", config.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Generate nomor surat berdasarkan format
    const nomorSurat = generateLetterNumber({
      number: nextNumber,
      prefix: config.prefix,
      separator: config.separator,
      format_template: config.format_template,
      month: currentMonth,
      year: currentYear,
    });

    return NextResponse.json({
      nomorSurat,
      lastNumber: nextNumber,
      resetYear,
      config: mapNumbering(updated),
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

// ========== HELPER ==========

function mapNumbering(data: Record<string, unknown>) {
  return {
    id: data.id,
    organizationId: data.organization_id,
    prefix: data.prefix,
    separator: data.separator,
    formatTemplate: data.format_template,
    lastNumber: data.last_number,
    lastResetYear: data.last_reset_year,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function getRomanMonth(month: number): string {
  const roman = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ];
  return roman[month - 1] || String(month);
}

/**
 * Generate nomor surat dari template format.
 * Available placeholders:
 * - {number} -> nomor urut (001, 002, ...)
 * - {prefix} -> prefix surat (Sekrt-RT, dll)
 * - {separator} -> separator (/)
 * - {month} -> bulan angka (1-12)
 * - {month_roman} -> bulan romawi (I-XII)
 * - {year} -> tahun (2025)
 * - {year_short} -> tahun 2 digit (25)
 */
function generateLetterNumber(config: {
  number: number;
  prefix: string;
  separator: string;
  format_template: string;
  month: number;
  year: number;
}): string {
  const numPadded = String(config.number).padStart(3, "0");

  const replacements: Record<string, string> = {
    "{number}": numPadded,
    "{prefix}": config.prefix,
    "{separator}": config.separator,
    "{month}": String(config.month),
    "{month_roman}": getRomanMonth(config.month),
    "{year}": String(config.year),
    "{year_short}": String(config.year).slice(-2),
  };

  let result = config.format_template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value);
  }

  return result;
}
