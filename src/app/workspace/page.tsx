import { notFound } from "next/navigation";
import LocalWorkspace from "@/components/local-workspace";

export default function WorkspacePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <LocalWorkspace />;
}
