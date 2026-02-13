"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, RealtimeChannel } from "@supabase/supabase-js";

interface Bookmark {
    id: string;
    url: string;
    title: string;
    created_at: string;
    user_id: string;
}

export default function BookmarkDashboard({ user }: { user: User }) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const supabase = createClient();

    // Fetch bookmarks
    const fetchBookmarks = useCallback(async () => {
        setErrorMsg(null);
        const { data, error } = await supabase
            .from("bookmarks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Fetch error:", error);
            setErrorMsg(error.message);
        } else if (data) {
            setBookmarks(data);
        }
        setLoading(false);
    }, [user.id, supabase]);

    // Real-time subscription
    useEffect(() => {
        fetchBookmarks();

        const channel: RealtimeChannel = supabase
            .channel("bookmarks-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setBookmarks((prev) => {
                        // Check if bookmark already exists to avoid duplicates
                        if (prev.some((b) => b.id === payload.new.id)) return prev;
                        return [payload.new as Bookmark, ...prev];
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setBookmarks((prev) =>
                        prev.filter((b) => b.id !== payload.old.id)
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user.id, supabase, fetchBookmarks]);

    // Add bookmark
    const handleAddBookmark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() || !title.trim()) return;

        setAdding(true);
        setErrorMsg(null);

        // Ensure URL has protocol
        let finalUrl = url.trim();
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
            finalUrl = "https://" + finalUrl;
        }

        const { error } = await supabase.from("bookmarks").insert({
            url: finalUrl,
            title: title.trim(),
            user_id: user.id,
        });

        if (error) {
            console.error("Insert error:", error);
            setErrorMsg(error.message);
        } else {
            setUrl("");
            setTitle("");
            setShowForm(false);
            // Fallback: manually fetch if realtime is slow/disconnected
            fetchBookmarks();
        }

        setAdding(false);
    };

    // Delete bookmark
    const handleDeleteBookmark = async (id: string) => {
        setDeletingId(id);
        await supabase.from("bookmarks").delete().eq("id", id);
        setDeletingId(null);
    };

    // Sign out
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
    };

    // Extract domain from URL
    const getDomain = (urlString: string) => {
        try {
            const u = new URL(urlString);
            return u.hostname.replace("www.", "");
        } catch {
            return urlString;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative">
            {/* Background decorative elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
            </div>
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-lg font-semibold text-white">Smart Bookmark</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                            {user.user_metadata?.avatar_url && (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="Avatar"
                                    className="w-5 h-5 rounded-full"
                                />
                            )}
                            <span className="text-xs text-slate-400 max-w-[150px] truncate">
                                {user.user_metadata?.full_name || user.email}
                            </span>
                        </div>
                        <button
                            id="sign-out-btn"
                            onClick={handleSignOut}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Error Alert */}
                {errorMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Error: {errorMsg}</span>
                        </div>
                        <button onClick={() => setErrorMsg(null)} className="text-red-200 hover:text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Stats bar */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Your Bookmarks</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""} saved
                        </p>
                    </div>
                    <button
                        id="add-bookmark-toggle"
                        onClick={() => setShowForm(!showForm)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 cursor-pointer"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        {showForm ? "Cancel" : "Add Bookmark"}
                    </button>
                </div>

                {/* Add Bookmark Form */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${showForm ? "max-h-80 opacity-100 mb-8" : "max-h-0 opacity-0"
                        }`}
                >
                    <form
                        onSubmit={handleAddBookmark}
                        className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="bookmark-title"
                                    className="block text-xs font-medium text-slate-400 mb-2"
                                >
                                    Title
                                </label>
                                <input
                                    id="bookmark-title"
                                    type="text"
                                    placeholder="My awesome site"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="bookmark-url"
                                    className="block text-xs font-medium text-slate-400 mb-2"
                                >
                                    URL
                                </label>
                                <input
                                    id="bookmark-url"
                                    type="text"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                id="submit-bookmark-btn"
                                type="submit"
                                disabled={adding || !url.trim() || !title.trim()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none cursor-pointer"
                            >
                                {adding ? (
                                    <>
                                        <svg
                                            className="animate-spin w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    "Save Bookmark"
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Bookmark List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
                            <p className="text-sm text-slate-500">Loading bookmarks...</p>
                        </div>
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                            <svg
                                className="w-8 h-8 text-slate-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-300 mb-1">
                            No bookmarks yet
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Start saving your favorite websites by clicking the &quot;Add
                            Bookmark&quot; button above.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bookmarks.map((bookmark, index) => (
                            <div
                                key={bookmark.id}
                                className="group backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        {/* Favicon */}
                                        <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${getDomain(bookmark.url)}&sz=32`}
                                                alt=""
                                                className="w-5 h-5 rounded"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <a
                                                href={bookmark.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-white hover:text-indigo-400 transition-colors truncate block"
                                            >
                                                {bookmark.title}
                                            </a>
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                {getDomain(bookmark.url)}
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                {formatDate(bookmark.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <a
                                            href={bookmark.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-all"
                                            title="Open link"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                />
                                            </svg>
                                        </a>
                                        <button
                                            onClick={() => handleDeleteBookmark(bookmark.id)}
                                            disabled={deletingId === bookmark.id}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all disabled:opacity-50 cursor-pointer"
                                            title="Delete bookmark"
                                        >
                                            {deletingId === bookmark.id ? (
                                                <svg
                                                    className="animate-spin w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Real-time indicator */}
                <div className="fixed bottom-6 right-6 z-50">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl bg-slate-900/80 border border-white/[0.06] shadow-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-medium">
                            Live sync
                        </span>
                    </div>
                </div>
            </main>
        </div>
    );
}
