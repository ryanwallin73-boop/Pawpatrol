import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { customer, dogs } = await request.json();

  if (!customer?.first_name || !customer?.last_name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { error: custError } = await supabaseAdmin
    .from("customers")
    .update({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || null,
      phone: customer.phone || null,
      address_line1: customer.address_line1 || null,
      address_line2: customer.address_line2 || null,
      city: customer.city || null,
      state: customer.state || null,
      postal_code: customer.postal_code || null,
      neighborhood_id: customer.neighborhood_id || null,
      notes: customer.notes || null,
    })
    .eq("id", id);

  if (custError) {
    return NextResponse.json({ error: custError.message }, { status: 500 });
  }

  for (const dog of dogs || []) {
    if (!dog.name?.trim()) continue;
    const fields = {
      name: dog.name.trim(),
      breed: dog.breed || null,
      size: dog.size || null,
      weight_lb:
        dog.weight_lb === "" || dog.weight_lb == null
          ? null
          : Number(dog.weight_lb),
      vaccination_expiry: dog.vaccination_expiry || null,
      active: dog.active !== false,
    };

    const { error } = dog.id
      ? await supabaseAdmin.from("dogs").update(fields).eq("id", dog.id)
      : await supabaseAdmin
          .from("dogs")
          .insert({ ...fields, customer_id: id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
