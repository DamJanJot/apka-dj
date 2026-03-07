<?php

namespace App\Http\Controllers;

use App\Models\LegacyUser;
use App\Models\OrbitumFriendRequest;
use App\Models\OrbitumFriendship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrbitumFriendsController extends Controller
{
    public function list(Request $request)
    {
        $me = (int) $request->user()->id;

        $friends = LegacyUser::query()
            ->from('uzytkownicy as u')
            ->join('orbitum_friendships as f', function ($join) use ($me) {
                $join->on('u.id', '=', DB::raw("CASE WHEN f.user_one_id = {$me} THEN f.user_two_id ELSE f.user_one_id END"));
            })
            ->where(function ($q) use ($me) {
                $q->where('f.user_one_id', $me)->orWhere('f.user_two_id', $me);
            })
            ->select(['u.id', 'u.imie', 'u.nazwisko', 'u.email', 'u.zdjecie_profilowe'])
            ->orderBy('u.imie')
            ->orderBy('u.nazwisko')
            ->get();

        return response()->json($friends);
    }

    public function incoming(Request $request)
    {
        $me = (int) $request->user()->id;

        $items = OrbitumFriendRequest::query()
            ->from('orbitum_friend_requests as r')
            ->join('uzytkownicy as u', 'u.id', '=', 'r.from_user_id')
            ->where('r.to_user_id', $me)
            ->where('r.status', 'pending')
            ->select([
                'r.id',
                'r.from_user_id',
                'r.created_at',
                'u.imie',
                'u.nazwisko',
                'u.email',
                'u.zdjecie_profilowe',
            ])
            ->orderByDesc('r.created_at')
            ->get();

        return response()->json($items);
    }

    public function outgoing(Request $request)
    {
        $me = (int) $request->user()->id;

        $items = OrbitumFriendRequest::query()
            ->from('orbitum_friend_requests as r')
            ->join('uzytkownicy as u', 'u.id', '=', 'r.to_user_id')
            ->where('r.from_user_id', $me)
            ->where('r.status', 'pending')
            ->select([
                'r.id',
                'r.to_user_id',
                'r.created_at',
                'u.imie',
                'u.nazwisko',
                'u.email',
                'u.zdjecie_profilowe',
            ])
            ->orderByDesc('r.created_at')
            ->get();

        return response()->json($items);
    }

    public function search(Request $request)
    {
        $me = (int) $request->user()->id;
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        $users = LegacyUser::query()
            ->from('uzytkownicy as u')
            ->where('u.id', '!=', $me)
            ->where(function ($q) use ($query) {
                $like = '%' . $query . '%';
                $q->where('u.imie', 'like', $like)
                    ->orWhere('u.nazwisko', 'like', $like)
                    ->orWhere('u.email', 'like', $like)
                    ->orWhere('u.nick', 'like', $like);
            })
            ->select(['u.id', 'u.imie', 'u.nazwisko', 'u.email', 'u.zdjecie_profilowe'])
            ->orderBy('u.imie')
            ->limit(20)
            ->get()
            ->map(function ($u) use ($me) {
                $otherId = (int) $u->id;

                $friend = $this->areFriends($me, $otherId);
                $incoming = OrbitumFriendRequest::query()
                    ->where('from_user_id', $otherId)
                    ->where('to_user_id', $me)
                    ->where('status', 'pending')
                    ->exists();
                $outgoing = OrbitumFriendRequest::query()
                    ->where('from_user_id', $me)
                    ->where('to_user_id', $otherId)
                    ->where('status', 'pending')
                    ->exists();

                $u->friend_state = $friend ? 'friend' : ($incoming ? 'incoming' : ($outgoing ? 'outgoing' : 'none'));
                return $u;
            });

        return response()->json($users);
    }

    public function sendRequest(Request $request)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:uzytkownicy,id'],
        ]);

        $to = (int) $data['to_user_id'];
        if ($to === $me) {
            return response()->json(['message' => 'Nie mozesz zaprosic samego siebie.'], 422);
        }

        if ($this->areFriends($me, $to)) {
            return response()->json(['message' => 'Ten uzytkownik jest juz Twoim znajomym.'], 422);
        }

        $alreadyPending = OrbitumFriendRequest::query()
            ->where(function ($q) use ($me, $to) {
                $q->where('from_user_id', $me)->where('to_user_id', $to);
            })
            ->orWhere(function ($q) use ($me, $to) {
                $q->where('from_user_id', $to)->where('to_user_id', $me);
            })
            ->where('status', 'pending')
            ->exists();

        if ($alreadyPending) {
            return response()->json(['message' => 'Zaproszenie oczekuje na odpowiedz.'], 422);
        }

        $req = OrbitumFriendRequest::query()->create([
            'from_user_id' => $me,
            'to_user_id' => $to,
            'status' => 'pending',
        ]);

        return response()->json($req, 201);
    }

    public function cancelOutgoing(Request $request, int $id)
    {
        $me = (int) $request->user()->id;

        $req = OrbitumFriendRequest::query()
            ->where('id', $id)
            ->where('from_user_id', $me)
            ->where('status', 'pending')
            ->firstOrFail();

        $req->status = 'cancelled';
        $req->responded_at = now();
        $req->save();

        return response()->json(['ok' => true]);
    }

    public function acceptIncoming(Request $request, int $id)
    {
        $me = (int) $request->user()->id;

        $req = OrbitumFriendRequest::query()
            ->where('id', $id)
            ->where('to_user_id', $me)
            ->where('status', 'pending')
            ->firstOrFail();

        $pair = $this->normalizedPair((int) $req->from_user_id, $me);

        DB::transaction(function () use ($req, $pair) {
            OrbitumFriendship::query()->firstOrCreate([
                'user_one_id' => $pair[0],
                'user_two_id' => $pair[1],
            ]);

            $req->status = 'accepted';
            $req->responded_at = now();
            $req->save();
        });

        return response()->json(['ok' => true]);
    }

    public function rejectIncoming(Request $request, int $id)
    {
        $me = (int) $request->user()->id;

        $req = OrbitumFriendRequest::query()
            ->where('id', $id)
            ->where('to_user_id', $me)
            ->where('status', 'pending')
            ->firstOrFail();

        $req->status = 'rejected';
        $req->responded_at = now();
        $req->save();

        return response()->json(['ok' => true]);
    }

    private function areFriends(int $a, int $b): bool
    {
        $pair = $this->normalizedPair($a, $b);

        return OrbitumFriendship::query()
            ->where('user_one_id', $pair[0])
            ->where('user_two_id', $pair[1])
            ->exists();
    }

    private function normalizedPair(int $a, int $b): array
    {
        return $a < $b ? [$a, $b] : [$b, $a];
    }
}
