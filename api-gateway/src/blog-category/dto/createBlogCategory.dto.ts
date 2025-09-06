// src/blogCategory/dto/createBlogCategory.dto.ts
export class CreateBlogCategoryDto {
  name: string
  description?: string
  color?: string
}

// src/blogCategory/dto/updateBlogCategory.dto.ts
export class UpdateBlogCategoryDto {
  name?: string
  description?: string
  color?: string
}
