import { redirect } from "next/navigation";

export default function CustomerIndexPage() {
  redirect("/customer/send-file");
}
