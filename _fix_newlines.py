path = r'c:/Users/Krystian/Downloads/OPAC SYSTEM-20251217T070223Z-3-001/OPAC SYSTEM/frontend/src/components/AdminApproval/adminApproval.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
fixed_lines.append('            <label className="queue-filter history-filter">Sort\n')
fixed_lines.append('              <select value={historySort} onChange={(event) => setHistorySort(event.target.value)}>\n')
fixed_lines.append('                <option value="newest">Newest first</option>\n')
fixed_lines.append('                <option value="oldest">Oldest first</option>\n')
fixed_lines.append('              </select>\n')
fixed_lines.append("                <FaChevronDown className='history-dropdown-arrow2' aria-hidden='true' />\n")
fixed_lines.append('\n')
fixed_lines.append('            </label>\n')
fixed_lines.append('            <div className="history-search-wrap">\n')
fixed_lines.append('              <label className="review-search-label" htmlFor="history-search">Search titles</label>\n')
fixed_lines.append('              <input\n')
fixed_lines.append('                id="history-search"\n')
fixed_lines.append('                name="historySearchQuery"\n')
fixed_lines.append('                value={historySearchQuery}\n')
fixed_lines.append('                onChange={(event) => setHistorySearchQuery(event.target.value)}\n')
fixed_lines.append('                placeholder="Search by title or student name..."\n')
fixed_lines.append('                aria-label="Search submission history titles"\n')
fixed_lines.append('              />\n')
fixed_lines.append('            </div>\n')
fixed_lines.append('          </div>\n')

start_idx = None
for i, line in enumerate(lines):
    if 'history-filter\">Sort' in line and '\\n' in line:
        start_idx = i
        break

if start_idx is not None:
    end_idx = start_idx
    for j in range(start_idx, min(start_idx + 30, len(lines))):
        if '</div>' in lines[j]:
            end_idx = j
            break
    lines[start_idx:end_idx+1] = fixed_lines
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Fixed lines {start_idx+1} to {end_idx+1}')
else:
    print('Could not find corrupted block')