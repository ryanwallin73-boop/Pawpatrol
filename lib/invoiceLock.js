import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Once a booking has been on an emailed invoice it can't be changed.
//
// Returns null if the booking may be changed, otherwise { status, error }
// ready to send back as a JSON response.
export async function invoiceLockFor(bookingId) {
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("invoiced_at")
    .eq("id", bookingId)
    .single();
  if (error) return { status: 404, error: error.message };

  if (booking.invoiced_at) {
    return {
      status: 409,
      error: "This booking has already been invoiced, so it can't be changed.",
    };
  }
  return null;
}
