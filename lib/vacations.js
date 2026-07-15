import { supabaseAdmin } from "@/lib/supabaseAdmin";

// The vacation (dog's own or household-wide) covering `serviceDate`, or null.
export async function findVacation(dogId, serviceDate) {
  const { data: dog } = await supabaseAdmin
    .from("dogs")
    .select("name, customer_id")
    .eq("id", dogId)
    .maybeSingle();
  if (!dog) return null;

  let query = supabaseAdmin
    .from("vacation_days")
    .select("start_date, end_date")
    .lte("start_date", serviceDate)
    .gte("end_date", serviceDate)
    .limit(1);
  query = dog.customer_id
    ? query.or(`dog_id.eq.${dogId},customer_id.eq.${dog.customer_id}`)
    : query.eq("dog_id", dogId);

  const { data } = await query.maybeSingle();
  return data ? { ...data, dogName: dog.name } : null;
}
