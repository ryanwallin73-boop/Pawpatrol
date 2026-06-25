import Image from "next/image";
import hero from "@/pawpatroldogpic.png";
import CustomerForm from "@/app/_components/CustomerForm";

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
        <Image
          src={hero}
          alt="Austin Paw Patrol dogs — where dogs become family"
          className="h-40 w-full object-cover object-center sm:h-52"
          placeholder="blur"
          priority
        />
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#B85C38]">
          Join the Pack
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Tell us about you and your dog(s) and set up ACH payments.
        </p>

        <CustomerForm variant="public" submitUrl="/api/signup" />
      </div>
    </div>
  );
}
