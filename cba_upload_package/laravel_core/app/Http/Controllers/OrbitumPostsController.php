<?php

namespace App\Http\Controllers;

use App\Models\OrbitumFriendship;
use App\Models\OrbitumCommentMention;
use App\Models\OrbitumPostComment;
use App\Models\OrbitumPostMention;
use App\Models\OrbitumPost;
use App\Models\OrbitumPostAudience;
use App\Models\OrbitumPostReaction;
use App\Models\LegacyUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrbitumPostsController extends Controller
{
    public function feed(Request $request)
    {
        $me = (int) $request->user()->id;

        $posts = OrbitumPost::query()
            ->from('orbitum_posts as p')
            ->join('uzytkownicy as u', 'u.id', '=', 'p.author_user_id')
            ->where(function ($q) use ($me) {
                $q->where('p.author_user_id', $me)
                    ->orWhere('p.visibility', 'public')
                    ->orWhere(function ($inner) use ($me) {
                        $inner->where('p.visibility', 'friends')
                            ->whereExists(function ($sub) use ($me) {
                                $sub->select(DB::raw(1))
                                    ->from('orbitum_friendships as f')
                                    ->where(function ($pair) use ($me) {
                                        $pair->where(function ($q2) use ($me) {
                                            $q2->where('f.user_one_id', $me)
                                                ->whereColumn('f.user_two_id', 'p.author_user_id');
                                        })->orWhere(function ($q2) use ($me) {
                                            $q2->where('f.user_two_id', $me)
                                                ->whereColumn('f.user_one_id', 'p.author_user_id');
                                        });
                                    });
                            });
                    })
                    ->orWhere(function ($inner) use ($me) {
                        $inner->where('p.visibility', 'selected')
                            ->whereExists(function ($sub) use ($me) {
                                $sub->select(DB::raw(1))
                                    ->from('orbitum_post_audiences as a')
                                    ->whereColumn('a.post_id', 'p.id')
                                    ->where('a.user_id', $me);
                            });
                    });
            })
            ->select([
                'p.id',
                'p.author_user_id',
                'p.visibility',
                'p.body',
                'p.image_path',
                'p.created_at',
                'u.imie as author_imie',
                'u.nazwisko as author_nazwisko',
                'u.email as author_email',
                'u.zdjecie_profilowe as author_avatar',
            ])
            ->orderByDesc('p.created_at')
            ->limit(100)
            ->get();

        $postIds = $posts->pluck('id')->map(fn($v) => (int) $v)->all();
        $commentsByPost = empty($postIds)
            ? collect()
            : OrbitumPostComment::query()
                ->select(['post_id', DB::raw('COUNT(*) as cnt')])
                ->whereIn('post_id', $postIds)
                ->groupBy('post_id')
                ->pluck('cnt', 'post_id');

        $reactionsByPost = empty($postIds)
            ? collect()
            : OrbitumPostReaction::query()
                ->select(['post_id', DB::raw('COUNT(*) as cnt')])
                ->whereIn('post_id', $postIds)
                ->groupBy('post_id')
                ->pluck('cnt', 'post_id');

        $myReactions = empty($postIds)
            ? collect()
            : OrbitumPostReaction::query()
                ->whereIn('post_id', $postIds)
                ->where('user_id', $me)
                ->pluck('emoji', 'post_id');

        $reactionGroups = empty($postIds)
            ? collect()
            : OrbitumPostReaction::query()
                ->select(['post_id', 'emoji', DB::raw('COUNT(*) as cnt')])
                ->whereIn('post_id', $postIds)
                ->groupBy('post_id', 'emoji')
                ->get();

        $reactionGroupsByPost = [];
        foreach ($reactionGroups as $group) {
            $pid = (int) $group->post_id;
            if (!isset($reactionGroupsByPost[$pid])) {
                $reactionGroupsByPost[$pid] = [];
            }

            $reactionGroupsByPost[$pid][] = [
                'emoji' => (string) $group->emoji,
                'count' => (int) $group->cnt,
            ];
        }

        foreach ($posts as $post) {
            $pid = (int) $post->id;
            $post->comments_count = (int) ($commentsByPost[$pid] ?? 0);
            $post->reactions_count = (int) ($reactionsByPost[$pid] ?? 0);
            $post->my_reaction = $myReactions[$pid] ?? null;
            $post->reaction_groups = $reactionGroupsByPost[$pid] ?? [];
        }

        return response()->json($posts);
    }

    public function create(Request $request)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'visibility' => ['required', 'in:public,friends,selected'],
            'body' => ['nullable', 'string', 'max:10000', 'required_without:image'],
            'image' => ['nullable', 'image', 'max:8192', 'required_without:body'],
            'selected_user_ids' => ['nullable', 'array'],
            'selected_user_ids.*' => ['integer', 'exists:uzytkownicy,id'],
        ]);

        $visibility = (string) $data['visibility'];
        $selectedIds = collect($data['selected_user_ids'] ?? [])->map(fn($v) => (int) $v)->filter()->unique()->values();

        if ($visibility === 'selected' && $selectedIds->isEmpty()) {
            return response()->json(['message' => 'Dla widocznosci wybrani musisz wskazac odbiorcow.'], 422);
        }

        $friendIds = $this->friendIdsOf($me);
        if ($visibility === 'selected' && $selectedIds->diff($friendIds)->isNotEmpty()) {
            return response()->json(['message' => 'Mozesz wybrac tylko osoby z listy znajomych.'], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $dir = public_path('uploads/posts');

            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $filename = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $file->move($dir, $filename);
            $imagePath = 'uploads/posts/' . $filename;
        }

        $post = DB::transaction(function () use ($me, $visibility, $data, $imagePath, $selectedIds) {
            $created = OrbitumPost::query()->create([
                'author_user_id' => $me,
                'visibility' => $visibility,
                'body' => trim((string) ($data['body'] ?? '')),
                'image_path' => $imagePath,
            ]);

            if ($visibility === 'selected') {
                foreach ($selectedIds as $userId) {
                    OrbitumPostAudience::query()->create([
                        'post_id' => (int) $created->id,
                        'user_id' => (int) $userId,
                    ]);
                }
            }

            $this->createMentionsForPost(
                (int) $created->id,
                $me,
                (string) ($created->body ?? ''),
                $visibility,
                $selectedIds
            );

            return $created;
        });

        return response()->json($post, 201);
    }

    public function mySelectableFriends(Request $request)
    {
        $me = (int) $request->user()->id;
        $friendIds = $this->friendIdsOf($me);

        $users = DB::table('uzytkownicy as u')
            ->whereIn('u.id', $friendIds)
            ->select(['u.id', 'u.imie', 'u.nazwisko', 'u.email', 'u.zdjecie_profilowe'])
            ->orderBy('u.imie')
            ->orderBy('u.nazwisko')
            ->get();

        return response()->json($users);
    }

    public function comments(Request $request, int $postId)
    {
        $me = (int) $request->user()->id;
        $post = OrbitumPost::query()->findOrFail($postId);

        if (!$this->canUserSeePost($post, $me)) {
            return response()->json(['message' => 'Nie masz dostepu do komentarzy tego posta.'], 403);
        }

        $items = OrbitumPostComment::query()
            ->from('orbitum_post_comments as c')
            ->join('uzytkownicy as u', 'u.id', '=', 'c.user_id')
            ->where('c.post_id', $postId)
            ->select([
                'c.id',
                'c.post_id',
                'c.user_id',
                'c.body',
                'c.created_at',
                'u.imie',
                'u.nazwisko',
                'u.email',
                'u.zdjecie_profilowe',
            ])
            ->orderBy('c.created_at')
            ->limit(300)
            ->get();

        return response()->json($items);
    }

    public function addComment(Request $request, int $postId)
    {
        $me = (int) $request->user()->id;
        $post = OrbitumPost::query()->findOrFail($postId);

        if (!$this->canUserSeePost($post, $me)) {
            return response()->json(['message' => 'Nie masz dostepu do komentarzy tego posta.'], 403);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $comment = OrbitumPostComment::query()->create([
            'post_id' => $postId,
            'user_id' => $me,
            'body' => trim((string) $data['body']),
        ]);

        $this->createMentionsForComment(
            (int) $comment->id,
            $post,
            $me,
            (string) $comment->body
        );

        return response()->json($comment, 201);
    }

    public function updatePost(Request $request, int $postId)
    {
        $me = (int) $request->user()->id;

        $post = OrbitumPost::query()
            ->where('id', $postId)
            ->where('author_user_id', $me)
            ->firstOrFail();

        $data = $request->validate([
            'body' => ['required', 'string', 'max:10000'],
        ]);

        $post->body = trim((string) $data['body']);
        $post->save();

        OrbitumPostMention::query()->where('post_id', $postId)->delete();
        $selectedIds = OrbitumPostAudience::query()->where('post_id', $postId)->pluck('user_id');
        $this->createMentionsForPost($postId, $me, (string) $post->body, (string) $post->visibility, $selectedIds);

        return response()->json($post);
    }

    public function deletePost(Request $request, int $postId)
    {
        $me = (int) $request->user()->id;

        $post = OrbitumPost::query()
            ->where('id', $postId)
            ->where('author_user_id', $me)
            ->firstOrFail();

        $commentIds = OrbitumPostComment::query()
            ->where('post_id', $postId)
            ->pluck('id');

        DB::transaction(function () use ($postId, $commentIds, $post) {
            if ($commentIds->isNotEmpty()) {
                OrbitumCommentMention::query()->whereIn('comment_id', $commentIds)->delete();
            }

            OrbitumPostComment::query()->where('post_id', $postId)->delete();
            OrbitumPostReaction::query()->where('post_id', $postId)->delete();
            OrbitumPostMention::query()->where('post_id', $postId)->delete();
            OrbitumPostAudience::query()->where('post_id', $postId)->delete();
            $post->delete();
        });

        return response()->json(['ok' => true]);
    }

    public function updateComment(Request $request, int $commentId)
    {
        $me = (int) $request->user()->id;

        $comment = OrbitumPostComment::query()
            ->where('id', $commentId)
            ->where('user_id', $me)
            ->firstOrFail();

        $post = OrbitumPost::query()->findOrFail((int) $comment->post_id);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $comment->body = trim((string) $data['body']);
        $comment->save();

        OrbitumCommentMention::query()->where('comment_id', $commentId)->delete();
        $this->createMentionsForComment($commentId, $post, $me, (string) $comment->body);

        return response()->json($comment);
    }

    public function deleteComment(Request $request, int $commentId)
    {
        $me = (int) $request->user()->id;

        $comment = OrbitumPostComment::query()
            ->where('id', $commentId)
            ->where('user_id', $me)
            ->firstOrFail();

        OrbitumCommentMention::query()->where('comment_id', $commentId)->delete();
        $comment->delete();

        return response()->json(['ok' => true]);
    }

    public function setReaction(Request $request, int $postId)
    {
        $me = (int) $request->user()->id;
        $post = OrbitumPost::query()->findOrFail($postId);

        if (!$this->canUserSeePost($post, $me)) {
            return response()->json(['message' => 'Nie masz dostepu do reakcji tego posta.'], 403);
        }

        $data = $request->validate([
            'emoji' => ['nullable', 'string', 'max:32'],
        ]);

        $emoji = trim((string) ($data['emoji'] ?? ''));

        if ($emoji === '') {
            OrbitumPostReaction::query()
                ->where('post_id', $postId)
                ->where('user_id', $me)
                ->delete();

            return response()->json(['ok' => true, 'emoji' => null]);
        }

        OrbitumPostReaction::query()->updateOrCreate(
            ['post_id' => $postId, 'user_id' => $me],
            ['emoji' => $emoji]
        );

        return response()->json(['ok' => true, 'emoji' => $emoji]);
    }

    public function mentionNotifications(Request $request)
    {
        $me = (int) $request->user()->id;

        $postItems = OrbitumPostMention::query()
            ->from('orbitum_post_mentions as m')
            ->join('orbitum_posts as p', 'p.id', '=', 'm.post_id')
            ->join('uzytkownicy as u', 'u.id', '=', 'm.mentioned_by_user_id')
            ->where('m.mentioned_user_id', $me)
            ->whereNull('m.read_at')
            ->select([
                'm.id',
                DB::raw("'post' as mention_type"),
                'm.post_id',
                DB::raw('NULL as comment_id'),
                'm.token',
                'm.created_at',
                'u.imie as by_imie',
                'u.nazwisko as by_nazwisko',
                'u.email as by_email',
                'p.body as post_body',
            ])
            ->get();

        $commentItems = OrbitumCommentMention::query()
            ->from('orbitum_comment_mentions as m')
            ->join('orbitum_post_comments as c', 'c.id', '=', 'm.comment_id')
            ->join('orbitum_posts as p', 'p.id', '=', 'c.post_id')
            ->join('uzytkownicy as u', 'u.id', '=', 'm.mentioned_by_user_id')
            ->where('m.mentioned_user_id', $me)
            ->whereNull('m.read_at')
            ->select([
                'm.id',
                DB::raw("'comment' as mention_type"),
                'c.post_id as post_id',
                'm.comment_id',
                'm.token',
                'm.created_at',
                'u.imie as by_imie',
                'u.nazwisko as by_nazwisko',
                'u.email as by_email',
                'c.body as post_body',
            ])
            ->get();

        $items = $postItems
            ->concat($commentItems)
            ->sortByDesc('created_at')
            ->take(20)
            ->values();

        return response()->json([
            'unread_count' => (int) ($postItems->count() + $commentItems->count()),
            'items' => $items,
        ]);
    }

    public function markMentionsRead(Request $request)
    {
        $me = (int) $request->user()->id;

        OrbitumPostMention::query()
            ->where('mentioned_user_id', $me)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        OrbitumCommentMention::query()
            ->where('mentioned_user_id', $me)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    private function createMentionsForComment(int $commentId, OrbitumPost $post, int $authorId, string $body): void
    {
        if ($body === '') {
            return;
        }

        preg_match_all('/@([\pL\pN._-]+)/u', $body, $matches);
        $tokens = collect($matches[1] ?? [])
            ->map(fn($t) => mb_strtolower(trim((string) $t)))
            ->filter()
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $selectedIds = OrbitumPostAudience::query()->where('post_id', (int) $post->id)->pluck('user_id');

        foreach ($tokens as $token) {
            $target = LegacyUser::query()
                ->from('uzytkownicy as u')
                ->whereRaw('LOWER(COALESCE(u.nick, "")) = ?', [$token])
                ->orWhereRaw('LOWER(COALESCE(u.imie, "")) = ?', [$token])
                ->orWhereRaw('LOWER(SUBSTRING_INDEX(COALESCE(u.email, ""), "@", 1)) = ?', [$token])
                ->select(['u.id'])
                ->first();

            if (!$target) {
                continue;
            }

            $targetId = (int) $target->id;
            if ($targetId === $authorId) {
                continue;
            }

            if (!$this->canUserSeePostByVisibility((int) $post->author_user_id, (string) $post->visibility, $targetId, $selectedIds)) {
                continue;
            }

            OrbitumCommentMention::query()->firstOrCreate([
                'comment_id' => $commentId,
                'mentioned_user_id' => $targetId,
            ], [
                'mentioned_by_user_id' => $authorId,
                'token' => $token,
                'read_at' => null,
            ]);
        }
    }

    private function createMentionsForPost(int $postId, int $authorId, string $body, string $visibility, $selectedIds): void
    {
        if ($body === '') {
            return;
        }

        preg_match_all('/@([\pL\pN._-]+)/u', $body, $matches);
        $tokens = collect($matches[1] ?? [])
            ->map(fn($t) => mb_strtolower(trim((string) $t)))
            ->filter()
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return;
        }

        foreach ($tokens as $token) {
            $target = LegacyUser::query()
                ->from('uzytkownicy as u')
                ->whereRaw('LOWER(COALESCE(u.nick, "")) = ?', [$token])
                ->orWhereRaw('LOWER(COALESCE(u.imie, "")) = ?', [$token])
                ->orWhereRaw('LOWER(SUBSTRING_INDEX(COALESCE(u.email, ""), "@", 1)) = ?', [$token])
                ->select(['u.id'])
                ->first();

            if (!$target) {
                continue;
            }

            $targetId = (int) $target->id;
            if ($targetId === $authorId) {
                continue;
            }

            if (!$this->canUserSeePostByVisibility($authorId, $visibility, $targetId, collect($selectedIds))) {
                continue;
            }

            OrbitumPostMention::query()->firstOrCreate([
                'post_id' => $postId,
                'mentioned_user_id' => $targetId,
            ], [
                'mentioned_by_user_id' => $authorId,
                'token' => $token,
                'read_at' => null,
            ]);
        }
    }

    private function canUserSeePost(OrbitumPost $post, int $viewerId): bool
    {
        $selectedIds = OrbitumPostAudience::query()
            ->where('post_id', (int) $post->id)
            ->pluck('user_id')
            ->map(fn($v) => (int) $v);

        return $this->canUserSeePostByVisibility((int) $post->author_user_id, (string) $post->visibility, $viewerId, $selectedIds);
    }

    private function canUserSeePostByVisibility(int $authorId, string $visibility, int $viewerId, $selectedIds): bool
    {
        if ($authorId === $viewerId) {
            return true;
        }

        if ($visibility === 'public') {
            return true;
        }

        if ($visibility === 'friends') {
            [$one, $two] = $authorId < $viewerId ? [$authorId, $viewerId] : [$viewerId, $authorId];
            return OrbitumFriendship::query()
                ->where('user_one_id', $one)
                ->where('user_two_id', $two)
                ->exists();
        }

        if ($visibility === 'selected') {
            return collect($selectedIds)->map(fn($v) => (int) $v)->contains($viewerId);
        }

        return false;
    }

    private function friendIdsOf(int $me)
    {
        return OrbitumFriendship::query()
            ->where('user_one_id', $me)
            ->orWhere('user_two_id', $me)
            ->get()
            ->map(function ($f) use ($me) {
                return (int) ((int) $f->user_one_id === $me ? $f->user_two_id : $f->user_one_id);
            })
            ->unique()
            ->values();
    }
}
