import { Schema, model, models, type Model, type Types } from "mongoose";

export type TaxonomyRecord = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  isPublished: boolean;
  isArchived: boolean;
  seoTitle: string;
  seoDescription: string;
};

function taxonomySchema() {
  const schema = new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
      description: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      imageAlt: { type: String, default: "" },
      sortOrder: { type: Number, default: 0 },
      isPublished: { type: Boolean, default: false },
      isArchived: { type: Boolean, default: false },
      seoTitle: { type: String, default: "" },
      seoDescription: { type: String, default: "" },
    },
    { timestamps: true },
  );
  schema.index({ isPublished: 1, isArchived: 1, sortOrder: 1 });
  return schema;
}

export const CategoryModel = (models.Category || model("Category", taxonomySchema())) as Model<TaxonomyRecord>;
export const CollectionModel = (models.Collection || model("Collection", taxonomySchema())) as Model<TaxonomyRecord>;
