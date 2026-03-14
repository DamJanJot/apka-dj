<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskoraBridgeController extends Controller
{
    /**
     * @return array{me:int, linked_ids:array<int>, missing_names:array<int,array{id:int,name:string}>}
     */
    private function resolveAccessContext(Request $request): array
    {
        $me = (int) $request->user()->id;

        $optivioRows = DB::table('optivio_projects')
            ->where('user_id', $me)
            ->select(['id', 'name', 'taskora_project_id'])
            ->get();

        $linkedIds = [];
        $missing = [];

        foreach ($optivioRows as $row) {
            $linked = isset($row->taskora_project_id) ? (int) $row->taskora_project_id : 0;
            if ($linked > 0) {
                $linkedIds[] = $linked;
                continue;
            }

            $name = trim((string) ($row->name ?? ''));
            if ($name !== '') {
                $missing[] = ['id' => (int) $row->id, 'name' => $name];
            }
        }

        // Legacy fallback: jeśli nie ma mapowania, spróbuj znaleźć istniejący projekt Taskory po tej samej nazwie.
        if (!empty($missing)) {
            foreach ($missing as $project) {
                $found = DB::table('taskora_projects')
                    ->where('title', $project['name'])
                    ->orderByDesc('updated_at')
                    ->orderByDesc('id')
                    ->first(['id']);

                if (!$found || !isset($found->id)) {
                    continue;
                }

                $taskoraProjectId = (int) $found->id;
                DB::table('optivio_projects')
                    ->where('id', $project['id'])
                    ->where('user_id', $me)
                    ->update(['taskora_project_id' => $taskoraProjectId]);

                $linkedIds[] = $taskoraProjectId;
            }
        }

        $linkedIds = array_values(array_unique(array_filter($linkedIds, fn($id) => (int) $id > 0)));

        return [
            'me' => $me,
            'linked_ids' => $linkedIds,
            'missing_names' => $missing,
        ];
    }

    private function findAccessibleProject(Request $request, int $projectId): ?object
    {
        $ctx = $this->resolveAccessContext($request);
        $me = (int) $ctx['me'];
        $linkedIds = $ctx['linked_ids'];

        $query = DB::table('taskora_projects')
            ->where('id', $projectId)
            ->where(function ($q) use ($me, $linkedIds) {
                $q->where('user_id', $me);
                if (!empty($linkedIds)) {
                    $q->orWhereIn('id', $linkedIds);
                }
            });

        return $query->first(['id', 'user_id', 'title', 'description']);
    }

    public function projects(Request $request)
    {
        $ctx = $this->resolveAccessContext($request);
        $me = (int) $ctx['me'];
        $linkedIds = $ctx['linked_ids'];

        $rows = DB::table('taskora_projects as p')
            ->leftJoin('taskora_tasks as t', function ($join) {
                $join->on('t.project_id', '=', 'p.id')
                    ->on('t.user_id', '=', 'p.user_id');
            })
            ->where(function ($q) use ($me, $linkedIds) {
                $q->where('p.user_id', $me);
                if (!empty($linkedIds)) {
                    $q->orWhereIn('p.id', $linkedIds);
                }
            })
            ->groupBy('p.id', 'p.user_id', 'p.title', 'p.description', 'p.created_at', 'p.updated_at')
            ->orderByDesc('p.updated_at')
            ->select([
                'p.id',
                'p.title',
                'p.description',
                'p.created_at',
                'p.updated_at',
                DB::raw("COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END),0) AS done_count"),
                DB::raw('COALESCE(COUNT(t.id),0) AS total_count'),
            ])
            ->get();

        $items = $rows->map(function ($row) {
            $total = (int) ($row->total_count ?? 0);
            $done = (int) ($row->done_count ?? 0);
            return [
                'id' => (int) $row->id,
                'title' => (string) $row->title,
                'description' => (string) ($row->description ?? ''),
                'total_count' => $total,
                'done_count' => $done,
                'progress_percent' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
                'created_at' => (string) $row->created_at,
                'updated_at' => (string) $row->updated_at,
            ];
        });

        return response()->json($items);
    }

    public function createProject(Request $request)
    {
        $me = (int) $request->user()->id;

        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:190'],
            'description' => ['nullable', 'string', 'max:10000'],
        ]);

        $id = DB::table('taskora_projects')->insertGetId([
            'user_id' => $me,
            'title' => trim((string) $data['title']),
            'description' => trim((string) ($data['description'] ?? '')),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'id' => (int) $id,
        ], 201);
    }

    public function tasks(Request $request, int $projectId)
    {
        $project = $this->findAccessibleProject($request, $projectId);
        if (!$project) {
            return response()->json(['message' => 'Nie znaleziono projektu.'], 404);
        }

        $ownerId = (int) $project->user_id;

        $tasks = DB::table('taskora_tasks')
            ->where('user_id', $ownerId)
            ->where('project_id', $projectId)
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['id', 'project_id', 'title', 'description', 'status', 'created_at'])
            ->map(function ($task) {
                $status = (string) ($task->status ?? 'ready');
                if ($status === 'in_progress') $status = 'progress';

                return [
                    'id' => (int) $task->id,
                    'project_id' => (int) $task->project_id,
                    'title' => (string) $task->title,
                    'description' => (string) ($task->description ?? ''),
                    'status' => $status,
                    'created_at' => (string) $task->created_at,
                ];
            })
            ->values();

        return response()->json($tasks);
    }

    public function createTask(Request $request, int $projectId)
    {
        $project = $this->findAccessibleProject($request, $projectId);
        if (!$project) {
            return response()->json(['message' => 'Nie znaleziono projektu.'], 404);
        }

        // Taskora trzyma taski pod ownerem projektu; to zachowuje zgodnosc z istniejacym panelem Taskory.
        $ownerId = (int) $project->user_id;

        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:190'],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['nullable', 'in:ready,progress,review,done'],
        ]);

        $status = (string) ($data['status'] ?? 'ready');
        $statusToSave = $status === 'progress' ? 'in_progress' : $status;

        $nextSort = (int) (DB::table('taskora_tasks')
            ->where('user_id', $ownerId)
            ->where('project_id', $projectId)
            ->max('sort_order') ?? 0) + 1;

        $id = DB::table('taskora_tasks')->insertGetId([
            'user_id' => $ownerId,
            'project_id' => $projectId,
            'title' => trim((string) $data['title']),
            'description' => trim((string) ($data['description'] ?? '')),
            'status' => $statusToSave,
            'sort_order' => $nextSort,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'id' => (int) $id,
        ], 201);
    }
}
