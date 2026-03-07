<?php

namespace App\Http\Controllers;

use App\Models\OrbitumFriendship;
use App\Models\OrbitumPost;
use App\Models\OrbitumPostAudience;
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
