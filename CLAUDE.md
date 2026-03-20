# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a single-file TODO web application (`todo.html`) built with vanilla HTML, CSS, and JavaScript. No build tools, frameworks, or dependencies are required.

## Running the App

Open `todo.html` directly in a browser — no server or build step needed.

## Architecture

Everything lives in `todo.html`:
- **HTML** — structure and layout
- **CSS** (inline `<style>`) — styling with Flexbox, responsive design
- **JavaScript** (inline `<script>`) — app logic using `localStorage` for persistence

Key JS patterns:
- `localStorage` is used to persist tasks across page reloads
- Tasks are rendered by rebuilding the list DOM from an in-memory array
- HTML escaping is applied when inserting user input to prevent XSS
