# Bearming Archive Toolkit

A lightweight archive script for Bear blogs. Groups posts by month and adds a year filter, search, and pagination.

Designed to feel native to Bear, and inspired by the great work of [Herman](https://github.com/HermanMartinus/bear-plugins) and
[Mighil’s post sorting script](https://mighil.com/script-to-sort-posts-by-month-on-bear-blog).


---

## Features

* Groups posts by month and year
* Year dropdown with post counts
* Live search across post titles
* Pagination
* No dependencies
* Scoped to blog pages only

---

## Requirements

The script runs on pages that list all blog posts and use the `blog` body class.

This includes:

* Pages using

  ```yaml
  class_name: blog
  ```
* Blogs using Bear’s built-in **Blog path** set to `blog` (for example `/blog`)

---

## Usage

Add the script to your blog page or to the header/footer directives.

```html
<script src="https://cdn.jsdelivr.net/gh/robertbirming/bear-plugins/archive-toolkit.js"></script>
```

That’s it.

---

## Notes

* The script only targets the post list inside `<main>`.
* Post lists elsewhere on the site are left untouched.
* Styling is inherited from your theme via:

```css
.archive-controls
.archive-h3
.pagination
```

---

## Part of Bearming

This script is part of **[Bearming](https://robertbirming.com/bearming/)** — a theme for the Bear blogging platform, focused on readability with a touch of modern styling and optional enhancements.
