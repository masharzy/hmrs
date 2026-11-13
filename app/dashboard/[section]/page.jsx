import { notFound } from "next/navigation";
export default async function DashboardSection({params}){const {section}=await params;if(!["overview","students","admissions","attendance","exams","marks","finance","notices","accounts","security","settings","records","results","profile"].includes(section))notFound();return null}
