"use client";

import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  return <div><h1 className="mb-6 font-serif text-4xl">Edit product</h1><ProductForm productId={params.id} /></div>;
}
