import type { Collection } from "tinacms";

export const PostCollection: Collection = {
  name: "post",
  label: "Blog Posts",
  path: "content/posts",
  format: "mdx",
  ui: {
    router: ({ document }) => {
      return `/blog/${document._sys.filename}`;
    },
  },
  fields: [
    {
      type: "string",
      name: "title",
      label: "Title",
      isTitle: true,
      required: true,
    },
    {
      type: "string",
      name: "description",
      label: "Description",
      ui: {
        component: "textarea",
      },
    },
    {
      type: "datetime",
      name: "date",
      label: "Date",
      required: true,
    },
    {
      type: "image",
      name: "coverImage",
      label: "Cover Image",
    },
    {
      type: "string",
      name: "author",
      label: "Author",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
    },
  ],
};
