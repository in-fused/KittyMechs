"""Read-only planner for bounded KittyMech build/snapshot retention."""
import json
import os
import re
import time
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
C_ROOT = PROJECT / '.sites-runtime'
D_ROOT = Path('D:/CodexStorage/KittyMech-Web/.sites-runtime')
PINNED = {'overhaul-20261009/build-062'}  # Running LIMITED062 server: never prune.
GIB = 1024 ** 3


def category(name):
    if re.fullmatch(r'(handoff|preserved)-\d+', name):
        return 'snapshot'
    if re.fullmatch(r'build-\d+', name):
        return 'build'
    return None


def choose(rows, now, budget=2 * GIB, grace=86400, max_age=7 * 86400):
    """Never remove pinned or recently modified trees, even under pressure."""
    remove = []
    remaining = sum(r['bytes'] for r in rows)
    for kind in ('snapshot', 'build'):
        family = sorted((r for r in rows if r['kind'] == kind), key=lambda r: r['modified'], reverse=True)
        for index, row in enumerate(family):
            if row['pinned'] or now - row['modified'] < grace:
                continue
            if index > 0 or now - row['modified'] > max_age:
                remove.append(row)
                remaining -= row['bytes']
    for row in sorted(rows, key=lambda r: r['modified']):
        if remaining <= budget:
            break
        if row not in remove and not row['pinned'] and now - row['modified'] >= grace:
            remove.append(row)
            remaining -= row['bytes']
    return remove, remaining


def plan():
    rows = []
    total = 0
    errors = []
    now = time.time()
    for root in (C_ROOT, D_ROOT):
        if not root.exists():
            continue
        if root.is_symlink() or root.is_junction():
            raise RuntimeError('Expected a real storage root: ' + str(root))
        owners = {}
        for base, dirs, files in os.walk(root, followlinks=False, onerror=lambda error: errors.append(str(error))):
            parent = Path(base)
            dirs[:] = [n for n in dirs if not (parent / n).is_symlink() and not (parent / n).is_junction()]
            rel = parent.relative_to(root).as_posix()
            owner = next((r for p, r in owners.items() if parent == p or p in parent.parents), None)
            kind = category(parent.name)
            if kind and owner is None and 'node_modules' not in parent.parts:
                owner = {'path': str(parent), 'root': str(root), 'relative': rel, 'kind': kind,
                         'bytes': 0, 'modified': 0, 'pinned': rel in PINNED or any((ancestor / '.storage-pin').exists() for ancestor in (parent, *parent.parents) if ancestor == root or root in ancestor.parents)}
                owners[parent] = owner
                rows.append(owner)
            for name in files:
                p = parent / name
                if p.is_symlink():
                    if owner:
                        owner['pinned'] = True
                    continue
                try:
                    stat = p.stat()
                    total += stat.st_size
                    if owner:
                        owner['bytes'] += stat.st_size
                        owner['modified'] = max(owner['modified'], stat.st_mtime)
                except OSError as error:
                    errors.append(str(error))
                    if owner:
                        owner['pinned'] = True
            if owner and owner['modified'] == 0:
                owner['modified'] = parent.stat().st_mtime
    remove, remaining = choose(rows, now)
    return {'project': str(PROJECT), 'allowedRoots': [str(C_ROOT), str(D_ROOT)],
            'delete': remove, 'remainingSnapshotBuildBytes': remaining,
            'totalArtifactLogicalBytes': total, 'snapshotBuildBudgetBytes': 2 * GIB,
            'totalArtifactBudgetBytes': 48 * GIB, 'errors': errors}


if __name__ == '__main__':
    print(json.dumps(plan()))
