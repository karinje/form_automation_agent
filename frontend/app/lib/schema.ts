import { z } from "zod"

export const formSchema = z.object({
  // Add your form fields here
})

export type FormValues = z.infer<typeof formSchema> 