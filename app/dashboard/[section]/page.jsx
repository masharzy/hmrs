import { notFound } from "next/navigation";
export default async function DashboardSection({params}){const {section}=await params;if(!["overview","students","admissions","attendance","marks","finance","notices","routines","accounts","security","settings","records","results","profile"].includes(section))notFound();return null}
