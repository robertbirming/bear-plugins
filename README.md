# Bear Blog plugins

Small JavaScript extensions for [Bear Blog](https://bearblog.dev), designed to be dropped in and blend naturally with Bear.

<!--They are separated into **Blog** and **Dashboard** tools to distinguish if they are used on the rendering of the blog, or if they are an extension to the Bear editor and dashboard.-->

These extensions can be used by copying and pasting the JS into a `<script></script>` tag in the footer directive of your blog.

## Blog

### Lightbox

Opens post and page images in a full-screen viewer. Photos in the same paragraph form a set with previous/next, keyboard and swipe support. Styles included, using Bear's default color tokens.

[Code](/lightbox.js)

### Status.lol

Shows your latest [status.lol](https://status.lol) status as one quiet line, with a link to the status and how long ago it was posted. Statuses older than 14 days are hidden. Add this where the status should appear, followed by the script:

```html
<p class="status-lol" data-address="your-username" hidden></p>
```

Change the limit with `data-max-days`, for example `data-max-days="7"`.

[Code](/status-lol.js)

---

These scripts are provided as-is. Feel free to use or adapt them.

<!--
## Blog

### Blog archive

Utilities for the Bear post archive listing. Inspired by the great work of [Herman](https://github.com/HermanMartinus/bear-plugins) and
[Mighil’s post sorting script](https://mighil.com/script-to-sort-posts-by-month-on-bear-blog).

<a href="blog-archive.js">Code</a> | <a href="blog-archive.css">Style</a>

## Dashboard

These scripts can be added to [the footer of your dashboard](https://bearblog.dev/dashboard/customise/) in a `<script></script>` element.

### Dashboard notes

A small notes panel inside the Bear dashboard, useful for reminders, ideas, or things you don’t want to forget.

[Code](/dashboard-notes.js)

## Bearming

Part of my ongoing work with Bear and the [Bearming theme](https://robertbirming.com/bearming/).

### Archive toolkit

Utilities for the Bear post archive listing. Inspired by the great work of [Herman](https://github.com/HermanMartinus/bear-plugins) and
[Mighil’s post sorting script](https://mighil.com/script-to-sort-posts-by-month-on-bear-blog).

<a href="archive-toolkit.js">Code</a>

Embed:

```html
<script src="https://cdn.jsdelivr.net/gh/robertbirming/bear-plugins/archive-toolkit.js"></script>
```

### Date formatter

A small utility for formatting `<time datetime="...">` elements on Bear sites.  
Keeps dates consistent across the site, and works nicely with the Bearming archive toolkit by showing day-only dates in the archive list.

<a href="date-format.js">Code</a>

Embed:

```html
<script src="https://cdn.jsdelivr.net/gh/robertbirming/bear-plugins/date-format.js"></script>
```

### Gallery lightbox

Adds a simple lightbox for the [Bearming theme](https://robertbirming.com/bearming/).

<a href="gallery-lightbox.js">Code</a>

Embed:

```html
<script src="https://cdn.jsdelivr.net/gh/robertbirming/bear-plugins/gallery-lightbox.js"></script>
```

### Copy button

Adds a simple code copy button for the [Bearming theme](https://robertbirming.com/bearming/).

<a href="copy-button.js">Code</a>

Embed:

```html
<script src="https://cdn.jsdelivr.net/gh/robertbirming/bear-plugins/copy-button.js"></script>
```
-->
