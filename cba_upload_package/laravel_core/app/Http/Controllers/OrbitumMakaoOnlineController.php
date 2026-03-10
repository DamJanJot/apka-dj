<?php

namespace App\Http\Controllers;

use App\Models\LegacyUser;
use App\Models\OrbitumFriendship;
use App\Models\OrbitumMakaoInvite;
use App\Models\OrbitumMakaoRoom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrbitumMakaoOnlineController extends Controller
{
    public function overview(Request $request)
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

        $incoming = OrbitumMakaoInvite::query()
            ->from('orbitum_makao_invites as i')
            ->join('uzytkownicy as u', 'u.id', '=', 'i.from_user_id')
            ->where('i.to_user_id', $me)
            ->where('i.status', 'pending')
            ->select([
                'i.id',
                'i.from_user_id',
                'i.created_at',
                'u.imie',
                'u.nazwisko',
                'u.email',
                'u.zdjecie_profilowe',
            ])
            ->orderByDesc('i.created_at')
            ->get();

        $outgoing = OrbitumMakaoInvite::query()
            ->from('orbitum_makao_invites as i')
            ->join('uzytkownicy as u', 'u.id', '=', 'i.to_user_id')
            ->where('i.from_user_id', $me)
            ->where('i.status', 'pending')
            ->select([
                'i.id',
                'i.to_user_id',
                'i.created_at',
                'u.imie',
                'u.nazwisko',
                'u.email',
                'u.zdjecie_profilowe',
            ])
            ->orderByDesc('i.created_at')
            ->get();

        $activeRoom = OrbitumMakaoRoom::query()
            ->where('status', 'active')
            ->where(function ($q) use ($me) {
                $q->where('player_one_id', $me)
                    ->orWhere('player_two_id', $me);
            })
            ->latest('updated_at')
            ->first();

        return response()->json([
            'friends' => $friends,
            'incoming' => $incoming,
            'outgoing' => $outgoing,
            'active_room' => $activeRoom,
        ]);
    }

    public function invite(Request $request)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'friend_user_id' => ['required', 'integer', 'exists:uzytkownicy,id'],
        ]);

        $friendId = (int) $data['friend_user_id'];
        if ($friendId === $me) {
            return response()->json(['message' => 'Nie mozesz zaprosic samego siebie.'], 422);
        }

        if (!$this->areFriends($me, $friendId)) {
            return response()->json(['message' => 'Mozesz zapraszac tylko znajomych.'], 403);
        }

        $hasActiveRoom = OrbitumMakaoRoom::query()
            ->where('status', 'active')
            ->where(function ($q) use ($me, $friendId) {
                $q->where(function ($pair) use ($me, $friendId) {
                    $pair->where('player_one_id', $me)->where('player_two_id', $friendId);
                })->orWhere(function ($pair) use ($me, $friendId) {
                    $pair->where('player_one_id', $friendId)->where('player_two_id', $me);
                });
            })
            ->exists();

        if ($hasActiveRoom) {
            return response()->json(['message' => 'Macie juz aktywny pokoj.'], 422);
        }

        $pending = OrbitumMakaoInvite::query()
            ->where('status', 'pending')
            ->where(function ($q) use ($me, $friendId) {
                $q->where(function ($pair) use ($me, $friendId) {
                    $pair->where('from_user_id', $me)->where('to_user_id', $friendId);
                })->orWhere(function ($pair) use ($me, $friendId) {
                    $pair->where('from_user_id', $friendId)->where('to_user_id', $me);
                });
            })
            ->exists();

        if ($pending) {
            return response()->json(['message' => 'Zaproszenie juz oczekuje.'], 422);
        }

        $invite = OrbitumMakaoInvite::query()->create([
            'from_user_id' => $me,
            'to_user_id' => $friendId,
            'status' => 'pending',
        ]);

        return response()->json($invite, 201);
    }

    public function cancelOutgoing(Request $request, int $id)
    {
        $me = (int) $request->user()->id;

        $invite = OrbitumMakaoInvite::query()
            ->where('id', $id)
            ->where('from_user_id', $me)
            ->where('status', 'pending')
            ->firstOrFail();

        $invite->status = 'cancelled';
        $invite->responded_at = now();
        $invite->save();

        return response()->json(['ok' => true]);
    }

    public function rejectIncoming(Request $request, int $id)
    {
        $me = (int) $request->user()->id;

        $invite = OrbitumMakaoInvite::query()
            ->where('id', $id)
            ->where('to_user_id', $me)
            ->where('status', 'pending')
            ->firstOrFail();

        $invite->status = 'rejected';
        $invite->responded_at = now();
        $invite->save();

        return response()->json(['ok' => true]);
    }

    public function acceptIncoming(Request $request, int $id)
    {
        $me = (int) $request->user()->id;

        $invite = OrbitumMakaoInvite::query()
            ->where('id', $id)
            ->where('to_user_id', $me)
            ->where('status', 'pending')
            ->firstOrFail();

        $fromId = (int) $invite->from_user_id;
        if (!$this->areFriends($me, $fromId)) {
            return response()->json(['message' => 'Brak relacji znajomych.'], 403);
        }

        $room = DB::transaction(function () use ($invite, $fromId, $me) {
            $invite->status = 'accepted';
            $invite->responded_at = now();
            $invite->save();

            OrbitumMakaoInvite::query()
                ->where('status', 'pending')
                ->where(function ($q) use ($fromId, $me) {
                    $q->where(function ($pair) use ($fromId, $me) {
                        $pair->where('from_user_id', $fromId)->where('to_user_id', $me);
                    })->orWhere(function ($pair) use ($fromId, $me) {
                        $pair->where('from_user_id', $me)->where('to_user_id', $fromId);
                    });
                })
                ->update([
                    'status' => 'cancelled',
                    'responded_at' => now(),
                ]);

            $pair = $this->normalizedPair($fromId, $me);

            $existing = OrbitumMakaoRoom::query()
                ->where('status', 'active')
                ->where('player_one_id', $pair[0])
                ->where('player_two_id', $pair[1])
                ->first();

            if ($existing) {
                return $existing;
            }

            return OrbitumMakaoRoom::query()->create([
                'player_one_id' => $pair[0],
                'player_two_id' => $pair[1],
                'status' => 'active',
                'turn_user_id' => $pair[0],
                'state_json' => null,
                'action_version' => 0,
            ]);
        });

        return response()->json($room, 201);
    }

    public function room(Request $request, int $roomId)
    {
        $me = (int) $request->user()->id;

        $room = OrbitumMakaoRoom::query()->findOrFail($roomId);
        if (!$this->isRoomMember($room, $me)) {
            return response()->json(['message' => 'Brak dostepu do pokoju.'], 403);
        }

        return response()->json($room);
    }

    public function syncRoomState(Request $request, int $roomId)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'state' => ['required', 'array'],
            'turn_user_id' => ['required', 'integer'],
            'action_version' => ['required', 'integer', 'min:1'],
            'winner_user_id' => ['nullable', 'integer'],
        ]);

        $room = OrbitumMakaoRoom::query()->findOrFail($roomId);
        if (!$this->isRoomMember($room, $me)) {
            return response()->json(['message' => 'Brak dostepu do pokoju.'], 403);
        }

        if ((int) $data['action_version'] <= (int) $room->action_version) {
            return response()->json(['message' => 'Stan pokoju jest juz nowszy.', 'room' => $room], 409);
        }

        $nextTurn = (int) $data['turn_user_id'];
        if (!in_array($nextTurn, [(int) $room->player_one_id, (int) $room->player_two_id], true)) {
            return response()->json(['message' => 'Nieprawidlowy gracz tury.'], 422);
        }

        $winnerId = (int) ($data['winner_user_id'] ?? 0);
        if ($winnerId > 0 && !in_array($winnerId, [(int) $room->player_one_id, (int) $room->player_two_id], true)) {
            return response()->json(['message' => 'Nieprawidlowy zwyciezca.'], 422);
        }

        $room->state_json = $data['state'];
        $room->turn_user_id = $nextTurn;
        $room->last_action_by_user_id = $me;
        $room->action_version = (int) $data['action_version'];
        if ($winnerId > 0) {
            $room->status = 'finished';
        }
        $room->save();

        return response()->json($room);
    }

    public function leaveRoom(Request $request, int $roomId)
    {
        $me = (int) $request->user()->id;

        $room = OrbitumMakaoRoom::query()->findOrFail($roomId);
        if (!$this->isRoomMember($room, $me)) {
            return response()->json(['message' => 'Brak dostepu do pokoju.'], 403);
        }

        $room->status = 'finished';
        $room->last_action_by_user_id = $me;
        $room->save();

        return response()->json(['ok' => true]);
    }

    private function isRoomMember(OrbitumMakaoRoom $room, int $userId): bool
    {
        return (int) $room->player_one_id === $userId || (int) $room->player_two_id === $userId;
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
