import { useEffect } from 'react';

const upsertMeta = (selector, createAttrs, content) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttrs).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const SEO = ({ title, description, canonical, schema }) => {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description' }, description);
      upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    }
    if (title) upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical || window.location.href);

    const existingSchema = document.head.querySelector('script[data-market360-schema="true"]');
    if (existingSchema) existingSchema.remove();
    if (schema) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.market360Schema = 'true';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [title, description, canonical, schema]);

  return null;
};

export default SEO;
