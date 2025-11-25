import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageImage, source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

function resolveSlug(params: Awaited<PageProps<"/[[...slug]]">["params"]>): string[] {
  const raw = params.slug;
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0 || (raw.length === 1 && raw[0] === "index")) {
      return [];
    }
    return raw;
  }

  if (raw === "index") {
    return [];
  }

  return [raw];
}

export default async function Page(props: PageProps<"/[[...slug]]">) {
  const params = await props.params;
  const slug = resolveSlug(params);

  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/[[...slug]]">): Promise<Metadata> {
  const params = await props.params;
  const slug = resolveSlug(params);
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
