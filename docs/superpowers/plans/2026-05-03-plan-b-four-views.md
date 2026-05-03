# Plan B: Timeline + Chat + Zen + Dense Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the remaining 4 switchable views (Timeline Command, Conversational Flow, Zen Focus, Dense Dashboard), completing the 5-view system.

**Architecture:** Each view is a standalone React component in `components/views/`. All share the same props interface from `useSchedule`. Page.tsx already has the routing — just swap stubs for real components. Some views need supporting components (GanttTimeline, ChatPanel, FocusTimer, etc.).

**Tech Stack:** Next.js 14, React, CSS custom properties, SVG (for Gantt now line)

---

4 tasks, one per view. Each ships independently.
