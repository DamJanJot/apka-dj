<?php

namespace App\Http\Controllers;

use App\Models\LegacyUser;
use App\Models\OrbitumChatMessage;
use App\Models\OrbitumUserActivityStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrbitumChatController extends Controller
{
    public function users(Request $request)
    {
        $me = (int) $request->user()->id;

        $users = LegacyUser::query()
            ->from('uzytkownicy as u')
            ->leftJoin('orbitum_user_activity_statuses as s', 's.user_id', '=', 'u.id')
            ->where('u.id', '!=', $me)
            ->select([
                'u.id',
                'u.imie',
                'u.nazwisko',
                'u.email',
                'u.zdjecie_profilowe',
                's.is_online',
                's.last_seen_at',
            ])
            ->orderByRaw('COALESCE(s.is_online, 0) DESC')
            ->orderBy('u.imie')
            ->get();

        return response()->json($users);
    }

    public function thread(Request $request, int $userId)
    {
        $me = (int) $request->user()->id;

        LegacyUser::query()->where('id', $userId)->firstOrFail();

        OrbitumChatMessage::query()
            ->where('from_user_id', $userId)
            ->where('to_user_id', $me)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messages = OrbitumChatMessage::query()
            ->where(function ($q) use ($me, $userId) {
                $q->where('from_user_id', $me)->where('to_user_id', $userId);
            })
            ->orWhere(function ($q) use ($me, $userId) {
                $q->where('from_user_id', $userId)->where('to_user_id', $me);
            })
            ->orderBy('created_at')
            ->limit(400)
            ->get();

        return response()->json($messages);
    }

    public function send(Request $request)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:uzytkownicy,id'],
            'body' => ['nullable', 'string', 'max:4000', 'required_without:image'],
            'image' => ['nullable', 'image', 'max:5120', 'required_without:body'],
        ]);

        if ((int) $data['to_user_id'] === $me) {
            return response()->json(['message' => 'Nie mozesz wyslac wiadomosci do siebie.'], 422);
        }

        $body = trim((string) ($data['body'] ?? ''));
        $receiver = LegacyUser::query()->findOrFail((int) $data['to_user_id']);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $dir = public_path('uploads/chat');

            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $filename = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $file->move($dir, $filename);
            $imagePath = 'uploads/chat/' . $filename;
        }

        $isMention = $this->containsMentionForReceiver($body, $receiver);

        $message = OrbitumChatMessage::query()->create([
            'from_user_id' => $me,
            'to_user_id' => (int) $data['to_user_id'],
            'body' => $body,
            'image_path' => $imagePath,
            'is_mention' => $isMention,
        ]);

        return response()->json($message, 201);
    }

    public function notifications(Request $request)
    {
        $me = (int) $request->user()->id;

        $items = OrbitumChatMessage::query()
            ->from('orbitum_chat_messages as m')
            ->join('uzytkownicy as u', 'u.id', '=', 'm.from_user_id')
            ->where('m.to_user_id', $me)
            ->whereNull('m.read_at')
            ->select([
                'm.from_user_id',
                DB::raw('MAX(m.created_at) as latest_at'),
                DB::raw('COUNT(*) as unread_count'),
                DB::raw('SUM(CASE WHEN m.is_mention = 1 THEN 1 ELSE 0 END) as mention_count'),
                'u.imie as sender_name',
                'u.email as sender_email',
            ])
            ->groupBy('m.from_user_id', 'u.imie', 'u.email')
            ->orderByDesc('latest_at')
            ->limit(10)
            ->get();

        $unreadCount = OrbitumChatMessage::query()
            ->where('to_user_id', $me)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'items' => $items,
        ]);
    }

    public function markReadFromUser(Request $request, int $fromUserId)
    {
        $me = (int) $request->user()->id;

        OrbitumChatMessage::query()
            ->where('from_user_id', $fromUserId)
            ->where('to_user_id', $me)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function pingActivity(Request $request)
    {
        $me = (int) $request->user()->id;

        OrbitumUserActivityStatus::query()->updateOrCreate(
            ['user_id' => $me],
            ['is_online' => true, 'last_seen_at' => now()]
        );

        return response()->json(['ok' => true]);
    }

    public function setOffline(Request $request)
    {
        $me = (int) $request->user()->id;

        OrbitumUserActivityStatus::query()->updateOrCreate(
            ['user_id' => $me],
            ['is_online' => false, 'last_seen_at' => now()]
        );

        return response()->json(['ok' => true]);
    }

    private function containsMentionForReceiver(string $body, LegacyUser $receiver): bool
    {
        if ($body === '') {
            return false;
        }

        $tokens = array_filter([
            $receiver->nick ?? null,
            $receiver->imie ?? null,
            Str::before((string) ($receiver->email ?? ''), '@'),
        ]);

        if (empty($tokens)) {
            return false;
        }

        foreach ($tokens as $token) {
            $clean = preg_quote(mb_strtolower(trim((string) $token)), '/');
            if ($clean === '') {
                continue;
            }

            if (preg_match('/(^|\s)@' . $clean . '(\b|\s|[.!?,:;])/iu', mb_strtolower($body))) {
                return true;
            }
        }

        return false;
    }
}
