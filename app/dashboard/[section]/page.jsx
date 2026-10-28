import { notFound } from "next/navigation";
export default async function DashboardSection({params}){const {section}=await params;if(!["overview","students","admissions","attendance","marks","finance","notices","accounts","security","settings","records","results"].includes(section))notFound();return null}
