<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegacyUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class UserRoleController extends Controller
{
    public function assignments()
    {
        $roles = $this->rolesPayload();
        $apps = LegacyUser::availableApps();
        $panels = LegacyUser::availablePanels();

        $appAssignments = [];
        if (Schema::hasTable('neuronetix_role_app_assignments')) {
            $rows = DB::table('neuronetix_role_app_assignments')
                ->orderBy('role_key')
                ->orderBy('app_key')
                ->get(['role_key', 'app_key']);

            foreach ($rows as $row) {
                $roleKey = strtolower(trim((string) $row->role_key));
                $appKey = strtolower(trim((string) $row->app_key));
                $appAssignments[$roleKey] ??= [];
                if (!in_array($appKey, $appAssignments[$roleKey], true)) {
                    $appAssignments[$roleKey][] = $appKey;
                }
            }
        }

        $panelAssignments = [];
        if (Schema::hasTable('neuronetix_role_panel_assignments')) {
            $rows = DB::table('neuronetix_role_panel_assignments')
                ->orderBy('role_key')
                ->orderBy('app_key')
                ->orderBy('panel_key')
                ->get(['role_key', 'app_key', 'panel_key']);

            foreach ($rows as $row) {
                $roleKey = strtolower(trim((string) $row->role_key));
                $appKey = strtolower(trim((string) $row->app_key));
                $panelKey = strtolower(trim((string) $row->panel_key));

                $panelAssignments[$roleKey] ??= [];
                $panelAssignments[$roleKey][$appKey] ??= [];
                if (!in_array($panelKey, $panelAssignments[$roleKey][$appKey], true)) {
                    $panelAssignments[$roleKey][$appKey][] = $panelKey;
                }
            }
        }

        return response()->json([
            'roles' => $roles,
            'apps' => $apps,
            'panels' => $panels,
            'app_assignments' => $appAssignments,
            'panel_assignments' => $panelAssignments,
        ]);
    }

    public function syncRoleApps(Request $request, string $key)
    {
        if (!Schema::hasTable('neuronetix_role_app_assignments')) {
            return response()->json(['message' => 'Tabela przypisan aplikacji nie istnieje jeszcze w bazie.'], 422);
        }

        $roleKey = $this->normalizeExistingRoleKey($key);
        $data = $request->validate([
            'apps' => ['required', 'array'],
            'apps.*' => ['string', 'max:64'],
        ]);

        $allowedApps = LegacyUser::availableApps();
        $apps = collect($data['apps'])
            ->map(static fn ($app): string => strtolower(trim((string) $app)))
            ->filter(static fn (string $app): bool => in_array($app, $allowedApps, true))
            ->unique()
            ->values()
            ->all();

        DB::transaction(function () use ($roleKey, $apps) {
            DB::table('neuronetix_role_app_assignments')->where('role_key', $roleKey)->delete();

            foreach ($apps as $appKey) {
                DB::table('neuronetix_role_app_assignments')->insert([
                    'role_key' => $roleKey,
                    'app_key' => $appKey,
                    'created_at' => now(),
                ]);
            }
        });

        return response()->json(['ok' => true, 'apps' => $apps]);
    }

    public function syncRolePanels(Request $request, string $key)
    {
        if (!Schema::hasTable('neuronetix_role_panel_assignments')) {
            return response()->json(['message' => 'Tabela przypisan paneli nie istnieje jeszcze w bazie.'], 422);
        }

        $roleKey = $this->normalizeExistingRoleKey($key);
        $data = $request->validate([
            'panels' => ['required', 'array'],
        ]);

        $availablePanels = LegacyUser::availablePanels();
        $payload = [];

        foreach ($data['panels'] as $appKey => $panelKeys) {
            $normalizedAppKey = strtolower(trim((string) $appKey));
            if (!isset($availablePanels[$normalizedAppKey]) || !is_array($panelKeys)) {
                continue;
            }

            $payload[$normalizedAppKey] = collect($panelKeys)
                ->map(static fn ($panel): string => strtolower(trim((string) $panel)))
                ->filter(static fn (string $panel) => in_array($panel, $availablePanels[$normalizedAppKey], true))
                ->unique()
                ->values()
                ->all();
        }

        DB::transaction(function () use ($roleKey, $payload) {
            DB::table('neuronetix_role_panel_assignments')->where('role_key', $roleKey)->delete();

            foreach ($payload as $appKey => $panelKeys) {
                foreach ($panelKeys as $panelKey) {
                    DB::table('neuronetix_role_panel_assignments')->insert([
                        'role_key' => $roleKey,
                        'app_key' => $appKey,
                        'panel_key' => $panelKey,
                        'created_at' => now(),
                    ]);
                }
            }
        });

        return response()->json(['ok' => true, 'panels' => $payload]);
    }

    public function createRole(Request $request)
    {
        if (!Schema::hasTable('neuronetix_roles')) {
            return response()->json(['message' => 'Tabela rol nie istnieje jeszcze w bazie.'], 422);
        }

        $data = $request->validate([
            'key' => ['required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $key = strtolower(trim((string) $data['key']));
        if ($key === '') {
            return response()->json(['message' => 'Klucz roli nie moze byc pusty.'], 422);
        }

        $exists = DB::table('neuronetix_roles')->where('key', $key)->exists();
        if ($exists) {
            return response()->json(['message' => 'Rola o takim kluczu juz istnieje.'], 422);
        }

        $now = now();
        DB::table('neuronetix_roles')->insert([
            'key' => $key,
            'name' => trim((string) $data['name']),
            'description' => trim((string) ($data['description'] ?? '')) ?: null,
            'is_system' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'ok' => true,
            'role' => [
                'key' => $key,
                'name' => trim((string) $data['name']),
                'description' => trim((string) ($data['description'] ?? '')) ?: null,
                'is_system' => false,
            ],
        ], 201);
    }

    public function updateRole(Request $request, string $key)
    {
        if (!Schema::hasTable('neuronetix_roles')) {
            return response()->json(['message' => 'Tabela rol nie istnieje jeszcze w bazie.'], 422);
        }

        $normalizedKey = strtolower(trim($key));
        $role = DB::table('neuronetix_roles')->where('key', $normalizedKey)->first();
        if (!$role) {
            return response()->json(['message' => 'Rola nie zostala znaleziona.'], 404);
        }

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $nameProvided = array_key_exists('name', $data);
        $descProvided = array_key_exists('description', $data);
        if (!$nameProvided && !$descProvided) {
            return response()->json(['message' => 'Brak danych do aktualizacji roli.'], 422);
        }

        $update = ['updated_at' => now()];
        if ($nameProvided) {
            $update['name'] = trim((string) $data['name']);
        }
        if ($descProvided) {
            $update['description'] = trim((string) $data['description']) ?: null;
        }

        DB::table('neuronetix_roles')->where('key', $normalizedKey)->update($update);

        $fresh = DB::table('neuronetix_roles')->where('key', $normalizedKey)->first();

        return response()->json([
            'ok' => true,
            'role' => [
                'key' => (string) $fresh->key,
                'name' => (string) $fresh->name,
                'description' => $fresh->description ? (string) $fresh->description : null,
                'is_system' => (bool) $fresh->is_system,
            ],
        ]);
    }

    public function deleteRole(string $key)
    {
        if (!Schema::hasTable('neuronetix_roles')) {
            return response()->json(['message' => 'Tabela rol nie istnieje jeszcze w bazie.'], 422);
        }

        $normalizedKey = strtolower(trim($key));
        $role = DB::table('neuronetix_roles')->where('key', $normalizedKey)->first();
        if (!$role) {
            return response()->json(['message' => 'Rola nie zostala znaleziona.'], 404);
        }

        if ((bool) $role->is_system || in_array($normalizedKey, ['owner', 'admin'], true)) {
            return response()->json(['message' => 'Nie mozna usunac roli systemowej.'], 403);
        }

        $inUse = LegacyUser::query()->where('rola', $normalizedKey)->exists();
        if ($inUse) {
            return response()->json(['message' => 'Nie mozna usunac roli, poniewaz jest przypisana do uzytkownikow.'], 409);
        }

        DB::table('neuronetix_roles')->where('key', $normalizedKey)->delete();

        return response()->json(['ok' => true]);
    }

    public function createUser(Request $request)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'imie' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:uzytkownicy,email'],
            'password' => ['required', 'string', 'min:8', 'max:120', 'confirmed'],
            'nick' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'max:64'],
        ]);

        $actorRole = strtolower(trim((string) ($actor->rola ?? '')));
        $newRole = strtolower(trim((string) ($data['role'] ?? 'user')));
        if ($newRole === '') {
            $newRole = 'user';
        }

        if ($newRole === 'owner' && $actorRole !== 'owner') {
            return response()->json([
                'message' => 'Tylko owner moze tworzyc uzytkownika z rola owner.',
            ], 403);
        }

        if (Schema::hasTable('neuronetix_roles')) {
            $roleExists = DB::table('neuronetix_roles')
                ->where('key', $newRole)
                ->exists();

            if (!$roleExists) {
                return response()->json(['message' => 'Podana rola nie istnieje w slowniku ról.'], 422);
            }
        }

        $email = strtolower(trim((string) $data['email']));
        $nick = trim((string) ($data['nick'] ?? ''));
        if ($nick === '') {
            $nick = Str::before($email, '@');
        }

        $now = now();
        $createdUser = null;

        DB::transaction(function () use (&$createdUser, $data, $email, $nick, $newRole, $actor, $request, $now) {
            $createdUser = LegacyUser::query()->create([
                'imie' => trim((string) $data['imie']),
                'email' => $email,
                'nick' => $nick,
                'rola' => $newRole,
                'haslo' => Hash::make((string) $data['password']),
            ]);

            if (Schema::hasTable('neuronetix_role_change_logs')) {
                DB::table('neuronetix_role_change_logs')->insert([
                    'acted_by_user_id' => (int) $actor->id,
                    'target_user_id' => (int) $createdUser->id,
                    'old_role' => null,
                    'new_role' => $newRole,
                    'reason' => 'Utworzenie nowego uzytkownika.',
                    'ip_address' => $request->ip(),
                    'user_agent' => substr((string) ($request->userAgent() ?? ''), 0, 255),
                    'created_at' => $now,
                ]);
            }
        });

        return response()->json([
            'ok' => true,
            'user' => [
                'id' => (int) $createdUser->id,
                'email' => (string) $createdUser->email,
                'imie' => $createdUser->imie ? (string) $createdUser->imie : null,
                'nazwisko' => $createdUser->nazwisko ? (string) $createdUser->nazwisko : null,
                'nick' => $createdUser->nick ? (string) $createdUser->nick : null,
                'rola' => $createdUser->rola ? strtolower((string) $createdUser->rola) : '',
            ],
        ], 201);
    }

    public function users(Request $request)
    {
        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'q' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string', 'max:64'],
        ]);

        $perPage = (int) ($data['per_page'] ?? 20);
        $query = LegacyUser::query()
            ->select(['id', 'email', 'imie', 'nazwisko', 'nick', 'rola'])
            ->orderByDesc('id');

        if (!empty($data['q'])) {
            $q = trim((string) $data['q']);
            if ($q !== '') {
                $query->where(function ($sub) use ($q) {
                    $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
                    $sub->where('email', 'like', $like)
                        ->orWhere('imie', 'like', $like)
                        ->orWhere('nazwisko', 'like', $like)
                        ->orWhere('nick', 'like', $like);
                });
            }
        }

        if (!empty($data['role'])) {
            $query->where('rola', strtolower(trim((string) $data['role'])));
        }

        $paginator = $query->paginate($perPage)->appends($request->query());

        return response()->json([
            'data' => collect($paginator->items())->map(function (LegacyUser $u) {
                return [
                    'id' => (int) $u->id,
                    'email' => (string) $u->email,
                    'imie' => $u->imie ? (string) $u->imie : null,
                    'nazwisko' => $u->nazwisko ? (string) $u->nazwisko : null,
                    'nick' => $u->nick ? (string) $u->nick : null,
                    'rola' => $u->rola ? strtolower((string) $u->rola) : '',
                ];
            })->values(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function relations(Request $request)
    {
        if (!Schema::hasTable('neuronetix_user_relations')) {
            return response()->json([
                'data' => [],
                'relation_types' => $this->relationTypesCatalog(),
                'meta' => [
                    'page' => 1,
                    'per_page' => 20,
                    'total' => 0,
                    'last_page' => 1,
                ],
                'warning' => 'Tabela relacji nie istnieje jeszcze w bazie.',
            ]);
        }

        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'relation_type' => ['nullable', 'string', 'max:64'],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $perPage = (int) ($data['per_page'] ?? 20);

        $query = DB::table('neuronetix_user_relations as r')
            ->leftJoin('uzytkownicy as sup', 'sup.id', '=', 'r.supervisor_user_id')
            ->leftJoin('uzytkownicy as sub', 'sub.id', '=', 'r.subordinate_user_id')
            ->leftJoin('uzytkownicy as act', 'act.id', '=', 'r.created_by_user_id')
            ->select([
                'r.id',
                'r.relation_type',
                'r.activity_scope',
                'r.notes',
                'r.created_at',
                'r.updated_at',
                'sup.id as supervisor_id',
                'sup.imie as supervisor_imie',
                'sup.nick as supervisor_nick',
                'sup.email as supervisor_email',
                'sub.id as subordinate_id',
                'sub.imie as subordinate_imie',
                'sub.nick as subordinate_nick',
                'sub.email as subordinate_email',
                'act.id as actor_id',
                'act.imie as actor_imie',
                'act.nick as actor_nick',
                'act.email as actor_email',
            ]);

        if (!empty($data['relation_type'])) {
            $query->where('r.relation_type', strtolower(trim((string) $data['relation_type'])));
        }

        if (!empty($data['q'])) {
            $q = trim((string) $data['q']);
            if ($q !== '') {
                $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
                $query->where(function ($sub) use ($like) {
                    $sub->where('sup.imie', 'like', $like)
                        ->orWhere('sup.nick', 'like', $like)
                        ->orWhere('sup.email', 'like', $like)
                        ->orWhere('sub.imie', 'like', $like)
                        ->orWhere('sub.nick', 'like', $like)
                        ->orWhere('sub.email', 'like', $like)
                        ->orWhere('r.activity_scope', 'like', $like)
                        ->orWhere('r.notes', 'like', $like);
                });
            }
        }

        $paginator = $query
            ->orderByDesc('r.id')
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'data' => collect($paginator->items())->map(function (object $row) {
                return [
                    'id' => (int) $row->id,
                    'relation_type' => (string) $row->relation_type,
                    'activity_scope' => $row->activity_scope ? (string) $row->activity_scope : null,
                    'notes' => $row->notes ? (string) $row->notes : null,
                    'created_at' => (string) $row->created_at,
                    'updated_at' => (string) $row->updated_at,
                    'supervisor' => [
                        'id' => (int) $row->supervisor_id,
                        'imie' => $row->supervisor_imie ? (string) $row->supervisor_imie : null,
                        'nick' => $row->supervisor_nick ? (string) $row->supervisor_nick : null,
                        'email' => $row->supervisor_email ? (string) $row->supervisor_email : null,
                    ],
                    'subordinate' => [
                        'id' => (int) $row->subordinate_id,
                        'imie' => $row->subordinate_imie ? (string) $row->subordinate_imie : null,
                        'nick' => $row->subordinate_nick ? (string) $row->subordinate_nick : null,
                        'email' => $row->subordinate_email ? (string) $row->subordinate_email : null,
                    ],
                    'actor' => [
                        'id' => $row->actor_id ? (int) $row->actor_id : null,
                        'imie' => $row->actor_imie ? (string) $row->actor_imie : null,
                        'nick' => $row->actor_nick ? (string) $row->actor_nick : null,
                        'email' => $row->actor_email ? (string) $row->actor_email : null,
                    ],
                ];
            })->values(),
            'relation_types' => $this->relationTypesCatalog(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function createRelation(Request $request)
    {
        if (!Schema::hasTable('neuronetix_user_relations')) {
            return response()->json(['message' => 'Tabela relacji nie istnieje jeszcze w bazie.'], 422);
        }

        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'supervisor_user_id' => ['required', 'integer', 'min:1'],
            'subordinate_user_id' => ['required', 'integer', 'min:1'],
            'relation_type' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9_]+$/'],
            'activity_scope' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $supervisorId = (int) $data['supervisor_user_id'];
        $subordinateId = (int) $data['subordinate_user_id'];
        if ($supervisorId === $subordinateId) {
            return response()->json(['message' => 'Uzytkownik nadrzedny i podrzedny nie moga byc ta sama osoba.'], 422);
        }

        $supervisorExists = LegacyUser::query()->where('id', $supervisorId)->exists();
        $subordinateExists = LegacyUser::query()->where('id', $subordinateId)->exists();
        if (!$supervisorExists || !$subordinateExists) {
            return response()->json(['message' => 'Nie znaleziono jednego z wybranych uzytkownikow.'], 422);
        }

        $relationType = strtolower(trim((string) $data['relation_type']));
        $exists = DB::table('neuronetix_user_relations')
            ->where('supervisor_user_id', $supervisorId)
            ->where('subordinate_user_id', $subordinateId)
            ->where('relation_type', $relationType)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Taka relacja juz istnieje.'], 409);
        }

        $now = now();
        $id = DB::table('neuronetix_user_relations')->insertGetId([
            'supervisor_user_id' => $supervisorId,
            'subordinate_user_id' => $subordinateId,
            'relation_type' => $relationType,
            'activity_scope' => trim((string) ($data['activity_scope'] ?? '')) ?: null,
            'notes' => trim((string) ($data['notes'] ?? '')) ?: null,
            'created_by_user_id' => (int) $actor->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'ok' => true,
            'relation_id' => (int) $id,
        ], 201);
    }

    public function deleteRelation(int $relationId)
    {
        if (!Schema::hasTable('neuronetix_user_relations')) {
            return response()->json(['message' => 'Tabela relacji nie istnieje jeszcze w bazie.'], 422);
        }

        $deleted = DB::table('neuronetix_user_relations')->where('id', $relationId)->delete();
        if (!$deleted) {
            return response()->json(['message' => 'Relacja nie zostala znaleziona.'], 404);
        }

        return response()->json(['ok' => true]);
    }

    public function roles()
    {
        return response()->json(['data' => $this->rolesPayload()]);
    }

    public function history(Request $request)
    {
        if (!Schema::hasTable('neuronetix_role_change_logs')) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'page' => 1,
                    'per_page' => 25,
                    'total' => 0,
                    'last_page' => 1,
                ],
                'warning' => 'Tabela audytu nie istnieje jeszcze w bazie.',
            ]);
        }

        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'actor_user_id' => ['nullable', 'integer', 'min:1'],
            'target_user_id' => ['nullable', 'integer', 'min:1'],
            'new_role' => ['nullable', 'string', 'max:64'],
        ]);

        $perPage = (int) ($data['per_page'] ?? 25);
        $query = $this->baseHistoryQuery();

        if (!empty($data['actor_user_id'])) {
            $query->where('l.acted_by_user_id', (int) $data['actor_user_id']);
        }

        if (!empty($data['target_user_id'])) {
            $query->where('l.target_user_id', (int) $data['target_user_id']);
        }

        if (!empty($data['new_role'])) {
            $query->where('l.new_role', strtolower(trim((string) $data['new_role'])));
        }

        $paginator = $query
            ->orderByDesc('l.id')
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'data' => collect($paginator->items())->map(fn ($row) => $this->serializeHistoryRow($row))->values(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function userHistory(Request $request, int $userId)
    {
        if (!Schema::hasTable('neuronetix_role_change_logs')) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'page' => 1,
                    'per_page' => 25,
                    'total' => 0,
                    'last_page' => 1,
                ],
                'warning' => 'Tabela audytu nie istnieje jeszcze w bazie.',
            ]);
        }

        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $perPage = (int) ($data['per_page'] ?? 25);

        $paginator = $this->baseHistoryQuery()
            ->where('l.target_user_id', $userId)
            ->orderByDesc('l.id')
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'data' => collect($paginator->items())->map(fn ($row) => $this->serializeHistoryRow($row))->values(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function update(Request $request, int $userId)
    {
        $actor = $request->user();
        if (!$actor) {
            return response()->json(['message' => 'Brak autoryzacji.'], 401);
        }

        $data = $request->validate([
            'role' => ['required', 'string', 'max:64'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newRole = strtolower(trim((string) $data['role']));
        if ($newRole === '') {
            return response()->json(['message' => 'Rola nie moze byc pusta.'], 422);
        }

        if (Schema::hasTable('neuronetix_roles')) {
            $roleExists = DB::table('neuronetix_roles')
                ->where('key', $newRole)
                ->exists();

            if (!$roleExists) {
                return response()->json(['message' => 'Podana rola nie istnieje w slowniku ról.'], 422);
            }
        }

        $target = LegacyUser::query()->findOrFail($userId);

        $actorRole = strtolower(trim((string) ($actor->rola ?? '')));
        $oldRole = strtolower(trim((string) ($target->rola ?? '')));

        if ($actorRole !== 'owner' && ($oldRole === 'owner' || $newRole === 'owner')) {
            return response()->json([
                'message' => 'Tylko owner moze zmieniac role ownera lub nadawac role owner.',
            ], 403);
        }

        if ($oldRole === $newRole) {
            return response()->json([
                'ok' => true,
                'changed' => false,
                'message' => 'Uzytkownik ma juz te role.',
                'user' => [
                    'id' => (int) $target->id,
                    'email' => (string) $target->email,
                    'imie' => (string) ($target->imie ?? ''),
                    'nick' => (string) ($target->nick ?? ''),
                    'rola' => $oldRole,
                ],
            ]);
        }

        $reason = trim((string) ($data['reason'] ?? ''));
        $now = now();
        $auditId = null;

        DB::transaction(function () use ($target, $newRole, $reason, $actor, $request, $oldRole, $now, &$auditId) {
            $target->rola = $newRole;
            $target->save();

            $auditId = DB::table('neuronetix_role_change_logs')->insertGetId([
                'acted_by_user_id' => (int) $actor->id,
                'target_user_id' => (int) $target->id,
                'old_role' => $oldRole !== '' ? $oldRole : null,
                'new_role' => $newRole,
                'reason' => $reason !== '' ? $reason : null,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) ($request->userAgent() ?? ''), 0, 255),
                'created_at' => $now,
            ]);
        });

        return response()->json([
            'ok' => true,
            'changed' => true,
            'audit_id' => (int) $auditId,
            'user' => [
                'id' => (int) $target->id,
                'email' => (string) $target->email,
                'imie' => (string) ($target->imie ?? ''),
                'nick' => (string) ($target->nick ?? ''),
                'rola' => $newRole,
            ],
        ]);
    }

    private function baseHistoryQuery()
    {
        return DB::table('neuronetix_role_change_logs as l')
            ->leftJoin('uzytkownicy as actor', 'actor.id', '=', 'l.acted_by_user_id')
            ->leftJoin('uzytkownicy as target', 'target.id', '=', 'l.target_user_id')
            ->select([
                'l.id',
                'l.acted_by_user_id',
                'l.target_user_id',
                'l.old_role',
                'l.new_role',
                'l.reason',
                'l.ip_address',
                'l.user_agent',
                'l.created_at',
                'actor.email as actor_email',
                'actor.imie as actor_imie',
                'actor.nick as actor_nick',
                'target.email as target_email',
                'target.imie as target_imie',
                'target.nick as target_nick',
            ]);
    }

    private function rolesPayload(): array
    {
        if (Schema::hasTable('neuronetix_roles')) {
            return DB::table('neuronetix_roles')
                ->select(['key', 'name', 'description', 'is_system'])
                ->orderBy('name')
                ->get()
                ->map(function (object $role) {
                    return [
                        'key' => strtolower((string) $role->key),
                        'name' => (string) $role->name,
                        'description' => $role->description ? (string) $role->description : null,
                        'is_system' => (bool) $role->is_system,
                    ];
                })
                ->values()
                ->all();
        }

        return LegacyUser::query()
            ->whereNotNull('rola')
            ->where('rola', '<>', '')
            ->distinct()
            ->orderBy('rola')
            ->pluck('rola')
            ->map(function (string $role) {
                $key = strtolower(trim($role));
                return [
                    'key' => $key,
                    'name' => ucfirst($key),
                    'description' => null,
                    'is_system' => false,
                ];
            })
            ->values()
            ->all();
    }

    private function normalizeExistingRoleKey(string $key): string
    {
        $roleKey = strtolower(trim($key));

        $exists = false;
        if (Schema::hasTable('neuronetix_roles')) {
            $exists = DB::table('neuronetix_roles')->where('key', $roleKey)->exists();
        } else {
            $exists = LegacyUser::query()->where('rola', $roleKey)->exists();
        }

        abort_unless($exists, 404, 'Rola nie zostala znaleziona.');

        return $roleKey;
    }

    private function relationTypesCatalog(): array
    {
        return [
            [
                'key' => 'manager_employee',
                'label' => 'Manager -> Pracownik',
                'description' => 'Przelozony zarzadza zadaniami i priorytetami pracownika.',
            ],
            [
                'key' => 'teacher_student',
                'label' => 'Nauczyciel -> Uczen',
                'description' => 'Nauczyciel przypisuje i nadzoruje czynnosci ucznia.',
            ],
            [
                'key' => 'mentor_mentee',
                'label' => 'Mentor -> Mentee',
                'description' => 'Relacja mentoringowa do regularnego wsparcia i feedbacku.',
            ],
            [
                'key' => 'coordinator_executor',
                'label' => 'Koordynator -> Wykonawca',
                'description' => 'Koordynator planuje prace, wykonawca realizuje czynnosci.',
            ],
            [
                'key' => 'reviewer_author',
                'label' => 'Recenzent -> Autor',
                'description' => 'Recenzent akceptuje lub odrzuca prace autora.',
            ],
            [
                'key' => 'parent_child_process',
                'label' => 'Nadrzedny -> Podrzedny',
                'description' => 'Uniwersalna relacja hierarchiczna dla procesow organizacyjnych.',
            ],
        ];
    }

    private function serializeHistoryRow(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'old_role' => $row->old_role ? (string) $row->old_role : null,
            'new_role' => (string) $row->new_role,
            'reason' => $row->reason ? (string) $row->reason : null,
            'ip_address' => $row->ip_address ? (string) $row->ip_address : null,
            'user_agent' => $row->user_agent ? (string) $row->user_agent : null,
            'created_at' => (string) $row->created_at,
            'actor' => [
                'id' => (int) $row->acted_by_user_id,
                'email' => $row->actor_email ? (string) $row->actor_email : null,
                'imie' => $row->actor_imie ? (string) $row->actor_imie : null,
                'nick' => $row->actor_nick ? (string) $row->actor_nick : null,
            ],
            'target' => [
                'id' => (int) $row->target_user_id,
                'email' => $row->target_email ? (string) $row->target_email : null,
                'imie' => $row->target_imie ? (string) $row->target_imie : null,
                'nick' => $row->target_nick ? (string) $row->target_nick : null,
            ],
        ];
    }
}
