#!/usr/bin/env python3
"""
Analyze all Supabase interactions in the codebase
Maps every .from(), .rpc(), .channel(), .storage() call
"""

import os
import re
from collections import defaultdict
from pathlib import Path

# Repository source directory. This script lives in scripts/.
ROOT = Path(__file__).resolve().parents[1] / "src"

# Patterns to match
PATTERNS = {
    'from': re.compile(r'\.from\([\'"]([^\'")]+)[\'"]', re.MULTILINE),
    'rpc': re.compile(r'\.rpc\([\'"]([^\'")]+)[\'"]', re.MULTILINE),
    'channel': re.compile(r'\.channel\([\'"]([^\'")]+)[\'"]', re.MULTILINE),
    'storage': re.compile(r'\.storage\.from\([\'"]([^\'")]+)[\'"]', re.MULTILINE),
}

# Storage for results
file_interactions = defaultdict(lambda: {
    'tables': set(),
    'rpcs': set(),
    'channels': set(),
    'storage_buckets': set(),
    'operations': defaultdict(list),
})

table_files = defaultdict(set)
rpc_files = defaultdict(set)


def analyze_file(filepath):
    """Analyze a single TypeScript file for Supabase interactions"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return

    rel_path = str(filepath.relative_to(ROOT.parent))

    # Find all .from() calls (tables)
    for match in PATTERNS['from'].finditer(content):
        table_name = match.group(1)
        file_interactions[rel_path]['tables'].add(table_name)
        table_files[table_name].add(rel_path)

        # Try to find operations around this match
        context_start = max(0, match.start() - 200)
        context_end = min(len(content), match.end() + 200)
        context = content[context_start:context_end]

        operations = []
        if '.select(' in context:
            operations.append('SELECT')
        if '.insert(' in context:
            operations.append('INSERT')
        if '.update(' in context:
            operations.append('UPDATE')
        if '.upsert(' in context:
            operations.append('UPSERT')
        if '.delete(' in context:
            operations.append('DELETE')

        for op in operations:
            file_interactions[rel_path]['operations'][table_name].append(op)

    # Find all .rpc() calls
    for match in PATTERNS['rpc'].finditer(content):
        rpc_name = match.group(1)
        file_interactions[rel_path]['rpcs'].add(rpc_name)
        rpc_files[rpc_name].add(rel_path)

    # Find all .channel() calls
    for match in PATTERNS['channel'].finditer(content):
        channel_name = match.group(1)
        file_interactions[rel_path]['channels'].add(channel_name)

    # Find all .storage.from() calls
    for match in PATTERNS['storage'].finditer(content):
        bucket_name = match.group(1)
        file_interactions[rel_path]['storage_buckets'].add(bucket_name)


def main():
    # Scan all TypeScript files
    for filepath in ROOT.rglob('*.ts'):
        if 'node_modules' not in str(filepath):
            analyze_file(filepath)

    for filepath in ROOT.rglob('*.tsx'):
        if 'node_modules' not in str(filepath):
            analyze_file(filepath)

    # Generate report
    output_file = ROOT.parent / "checkpoints" / "2026-03-15_chatbot-oficial" / "07_DATA_ACCESS_MAP.md"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# DATA ACCESS MAP - ChatBot Oficial\n\n")
        f.write("**Generated:** 2026-03-15\n\n")
        f.write("Comprehensive mapping of ALL Supabase interactions across the codebase.\n\n")
        f.write("---\n\n")

        # ========================================
        # SECTION 1: BY FILE
        # ========================================
        f.write("## 1. INTERACTIONS BY FILE\n\n")
        f.write(f"**Total files with Supabase:** {len(file_interactions)}\n\n")

        # Sort files by path
        sorted_files = sorted(file_interactions.items())

        for filepath, data in sorted_files:
            if not any([data['tables'], data['rpcs'], data['channels'], data['storage_buckets']]):
                continue

            f.write(f"### `{filepath}`\n\n")

            if data['tables']:
                f.write("**Tables accessed:**\n")
                for table in sorted(data['tables']):
                    ops = data['operations'].get(table, [])
                    ops_str = ', '.join(set(ops)) if ops else 'UNKNOWN'
                    f.write(f"- `{table}` → Operations: {ops_str}\n")
                f.write("\n")

            if data['rpcs']:
                f.write("**RPC functions called:**\n")
                for rpc in sorted(data['rpcs']):
                    f.write(f"- `{rpc}()`\n")
                f.write("\n")

            if data['channels']:
                f.write("**Realtime channels:**\n")
                for channel in sorted(data['channels']):
                    f.write(f"- `{channel}`\n")
                f.write("\n")

            if data['storage_buckets']:
                f.write("**Storage buckets:**\n")
                for bucket in sorted(data['storage_buckets']):
                    f.write(f"- `{bucket}`\n")
                f.write("\n")

            f.write("---\n\n")

        # ========================================
        # SECTION 2: BY TABLE
        # ========================================
        f.write("## 2. INTERACTIONS BY TABLE\n\n")
        f.write(f"**Total tables accessed:** {len(table_files)}\n\n")

        for table_name in sorted(table_files.keys()):
            files = sorted(table_files[table_name])
            f.write(f"### Table: `{table_name}`\n\n")
            f.write(f"**Accessed by {len(files)} file(s):**\n\n")

            for filepath in files:
                ops = file_interactions[filepath]['operations'].get(table_name, [])
                ops_str = ', '.join(set(ops)) if ops else 'UNKNOWN'
                f.write(f"- `{filepath}` → {ops_str}\n")

            f.write("\n---\n\n")

        # ========================================
        # SECTION 3: RPC FUNCTIONS
        # ========================================
        f.write("## 3. RPC FUNCTIONS\n\n")
        f.write(f"**Total RPC functions used:** {len(rpc_files)}\n\n")

        for rpc_name in sorted(rpc_files.keys()):
            files = sorted(rpc_files[rpc_name])
            f.write(f"### RPC: `{rpc_name}()`\n\n")
            f.write(f"**Called by {len(files)} file(s):**\n\n")

            for filepath in files:
                f.write(f"- `{filepath}`\n")

            f.write("\n---\n\n")

        # ========================================
        # SECTION 4: REALTIME CHANNELS
        # ========================================
        f.write("## 4. REALTIME CHANNELS\n\n")

        channels_found = []
        for filepath, data in file_interactions.items():
            if data['channels']:
                for channel in data['channels']:
                    channels_found.append((channel, filepath))

        if channels_found:
            f.write(f"**Total realtime subscriptions:** {len(channels_found)}\n\n")
            for channel, filepath in sorted(channels_found):
                f.write(f"- `{channel}` → `{filepath}`\n")
        else:
            f.write("**No realtime channels found.**\n")

        f.write("\n---\n\n")

        # ========================================
        # SECTION 5: STORAGE BUCKETS
        # ========================================
        f.write("## 5. STORAGE BUCKETS\n\n")

        buckets_found = defaultdict(set)
        for filepath, data in file_interactions.items():
            if data['storage_buckets']:
                for bucket in data['storage_buckets']:
                    buckets_found[bucket].add(filepath)

        if buckets_found:
            f.write(f"**Total storage buckets used:** {len(buckets_found)}\n\n")
            for bucket in sorted(buckets_found.keys()):
                files = sorted(buckets_found[bucket])
                f.write(f"### Bucket: `{bucket}`\n\n")
                f.write(f"**Used by {len(files)} file(s):**\n\n")
                for filepath in files:
                    f.write(f"- `{filepath}`\n")
                f.write("\n")
        else:
            f.write("**No storage buckets found.**\n")

        f.write("\n---\n\n")

        # ========================================
        # SECTION 6: TENANT ISOLATION ANALYSIS
        # ========================================
        f.write("## 6. TENANT ISOLATION ANALYSIS\n\n")
        f.write("Files that access multi-tenant tables WITHOUT explicit `client_id` filter:\n\n")
        f.write("**⚠️ RISK:** These queries may leak data between tenants if RLS is not properly configured.\n\n")

        # Multi-tenant tables (require client_id filtering)
        multi_tenant_tables = {
            'clientes_whatsapp', 'conversations', 'n8n_chat_histories',
            'documents', 'messages', 'crm_cards', 'crm_settings',
            'agents', 'interactive_flows', 'flow_executions',
            'bot_configurations', 'tts_cache', 'lead_sources',
            'crm_automation_rules', 'conversion_events_log',
        }

        risky_files = []

        for filepath, data in file_interactions.items():
            for table in data['tables']:
                if table in multi_tenant_tables:
                    # Read file to check for client_id filtering
                    try:
                        full_path = ROOT.parent / filepath
                        with open(full_path, 'r', encoding='utf-8') as file_content:
                            content = file_content.read()

                            # Check if client_id is used near the table query
                            table_pattern = re.escape(table)
                            matches = list(re.finditer(rf'\.from\([\'"]' + table_pattern + r'[\'"]', content))

                            for match in matches:
                                # Get 300 chars context
                                context_start = max(0, match.start() - 150)
                                context_end = min(len(content), match.end() + 300)
                                context = content[context_start:context_end]

                                # Check for client_id filter
                                has_client_id = 'client_id' in context or 'eq("client_id"' in context or "eq('client_id'" in context

                                if not has_client_id:
                                    # Also check if it's service role (which bypasses RLS)
                                    is_service_role = 'createServiceRoleClient' in content or 'createServiceClient' in content

                                    risky_files.append({
                                        'file': filepath,
                                        'table': table,
                                        'service_role': is_service_role,
                                        'line': content[:match.start()].count('\n') + 1
                                    })
                    except:
                        pass

        if risky_files:
            f.write(f"**Found {len(risky_files)} potential issues:**\n\n")
            for risk in sorted(risky_files, key=lambda x: (x['table'], x['file'])):
                status = "🟡 SERVICE ROLE (RLS bypassed)" if risk['service_role'] else "🔴 HIGH RISK"
                f.write(f"- {status} `{risk['file']}` → `{risk['table']}` (line ~{risk['line']})\n")
        else:
            f.write("**✅ No obvious tenant isolation issues found.**\n")

        f.write("\n---\n\n")

        # ========================================
        # SUMMARY
        # ========================================
        f.write("## SUMMARY\n\n")
        f.write(f"- **Files analyzed:** {len(list(ROOT.rglob('*.ts'))) + len(list(ROOT.rglob('*.tsx')))}\n")
        f.write(f"- **Files with Supabase:** {len(file_interactions)}\n")
        f.write(f"- **Unique tables accessed:** {len(table_files)}\n")
        f.write(f"- **RPC functions used:** {len(rpc_files)}\n")
        f.write(f"- **Realtime channels:** {len(channels_found)}\n")
        f.write(f"- **Storage buckets:** {len(buckets_found)}\n")
        f.write(f"- **Potential tenant isolation issues:** {len(risky_files)}\n")
        f.write("\n---\n\n")
        f.write("**End of report.**\n")

    print(f"✅ Analysis complete! Report saved to: {output_file}")
    print(f"   - Files with Supabase: {len(file_interactions)}")
    print(f"   - Tables accessed: {len(table_files)}")
    print(f"   - RPC functions: {len(rpc_files)}")
    print(f"   - Tenant isolation risks: {len(risky_files)}")


if __name__ == "__main__":
    main()
