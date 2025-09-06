// src/blogPost/dto/createBlogPost.dto.ts
export class CreateBlogPostDto {
  title: string
  excerpt?: string
  content: string
  author: { name: string; role: string; avatar: string }
  publishedAt?: string
  readTime?: number
  category?: string
  tags?: string[]
  image?: string
  featured?: boolean
}

// src/blogPost/dto/updateBlogPost.dto.ts
export class UpdateBlogPostDto {
  title?: string
  excerpt?: string
  content?: string
  author?: { name: string; role: string; avatar: string }
  publishedAt?: string
  readTime?: number
  category?: string
  tags?: string[]
  image?: string
  featured?: boolean
}
