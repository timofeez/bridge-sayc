"""Сбор данных об Иване Татаркине с bridgesport.ru (ФСБР) в data/tatarkin.json.

Запуск:
  python scripts/tatarkin.py          — обновить карточку и добавить новые месячные рейтинги
  python scripts/tatarkin.py --full   — заодно пройти весь архив рейтингов (долго, один раз)
Только стандартная библиотека Python, чтобы работать в GitHub Actions без установки пакетов.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

PLAYER_ID = 4899
BASE = 'https://www.bridgesport.ru'
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'tatarkin.json')
MONTHS = {'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6, 'июля': 7,
          'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12}
MONTHS_NOM = {'январь': 1, 'февраль': 2, 'март': 3, 'апрель': 4, 'май': 5, 'июнь': 6, 'июль': 7,
              'август': 8, 'сентябрь': 9, 'октябрь': 10, 'ноябрь': 11, 'декабрь': 12}


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (bridge-sayc trainer; +https://timofeez.github.io/bridge-sayc/)'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception:
            if attempt == 2:
                raise
            time.sleep(5)


def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def num(s):
    s = text(s).replace(' ', '').replace(',', '.')
    try:
        return float(s) if '.' in s else int(s)
    except ValueError:
        return None


def parse_player(page):
    info = {}
    for label, key in [('РАЗРЯД', 'rank'), ('ТЕКУЩИЙ РЕЙТИНГ', 'rating'), ('ТЕКУЩЕЕ МЕСТО В РЕЙТИНГЕ', 'place'),
                       ('МАКС. МЕСТО В РЕЙТИНГЕ', 'best_place'), ('ПРИЗОВЫЕ БАЛЛЫ', 'pb'), ('МАСТЕРСКИЕ БАЛЛЫ', 'mb'),
                       ('ОНЛАЙН МАСТЕРСКИЕ БАЛЛЫ', 'online_mb'), ('НИК НА Гамблер', 'nick_gambler'), ('НИК НА BBO', 'nick_bbo'), ('Город', 'city')]:
        m = re.search(re.escape(label) + r'\s*</[^>]+>\s*(?:<[^>]+>\s*)*([^<]+)<', page)
        if m:
            v = html.unescape(m.group(1)).strip()
            info[key] = num(v) if key not in ('nick_gambler', 'nick_bbo', 'city') and num(v) is not None else v
    # Три вкладки: достижения, все выступления, клубные МБ — по порядку блоков TabsContent__Item
    tabs = re.split(r'<li class="TabsContent__Item', page)[1:]
    tables = []
    for t in tabs:
        rows = []
        for tr in re.findall(r'<tr class="js_Table__Row"[^>]*>(.*?)</tr>', t, flags=re.S):
            cells = {}
            for m in re.finditer(r'<td data-label="([^"]+)"([^>]*)>(.*?)</td>', tr, flags=re.S):
                label, attrs, body = m.group(1), m.group(2), m.group(3)
                d = re.search(r'data-date="([^"]+)"', attrs)
                link = re.search(r'href="(/tournaments/\d+/)"', body)
                cells[label] = {'t': text(body), 'date': d.group(1) if d else None, 'link': link.group(1) if link else None}
            rows.append(cells)
        tables.append(rows)

    def tourn(rows):
        out = []
        for c in rows:
            if 'турнир' not in c:
                continue
            partners = c.get('партнер/команда', {}).get('t', '')
            out.append({
                'date': c['Год']['date'], 'year': num(c['Год']['t']), 'name': c['турнир']['t'],
                'link': BASE + c['турнир']['link'] if c['турнир']['link'] else None,
                'partners': partners, 'place': num(c.get('место', {}).get('t', '')),
                'ro': num(c.get('РО', {}).get('t', '')), 'pb': num(c.get('ПБ', {}).get('t', '')), 'mb': num(c.get('МБ', {}).get('t', '')),
            })
        return out

    achievements = tourn(tables[0]) if len(tables) > 0 else []
    performances = tourn(tables[1]) if len(tables) > 1 else []
    club = []
    if len(tables) > 2:
        for c in tables[2]:
            if 'Дата' not in c:
                continue
            parts = c['Дата']['t'].lower().split()
            month = MONTHS_NOM.get(parts[0]) if parts else None
            year = num(parts[1]) if len(parts) > 1 else None
            club.append({'month': f'{year}-{month:02d}' if month and year else c['Дата']['t'], 'source': c.get('Источник', {}).get('t', ''),
                         'mb': num(c.get('МБ', {}).get('t', '')) or 0, 'online_mb': num(c.get('Онлайн МБ', {}).get('t', '')) or 0})
    return info, achievements, performances, club


def rating_periods(max_pages):
    """Ссылки на «Открытый рейтинг на <дата>» со страниц архива рейтингов."""
    found = {}
    for p in range(1, max_pages + 1):
        page = get(f'{BASE}/players-and-ratings/ratings/?PAGEN_1={p}')
        items = re.findall(r'href="(https?://[^"]*/players-and-ratings/ratings/\d+/|/players-and-ratings/ratings/\d+/)"[^>]*>\s*([^<]+?)\s*</a>', page)
        new = 0
        for href, title in items:
            m = re.match(r'Открытый рейтинг на (\d+) (\S+) (\d{4})', html.unescape(title).strip())
            if not m or m.group(2) not in MONTHS:
                continue
            date = f'{int(m.group(3)):04d}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}'
            url = href if href.startswith('http') else BASE + href
            if date not in found:
                found[date] = url
                new += 1
        if not items or (p > 1 and new == 0 and 'PAGEN_1=' + str(p + 1) not in page):
            break
        time.sleep(1)
    return found


def rating_row(url):
    page = get(url)
    i = page.find(f'/search-player/{PLAYER_ID}/')
    if i < 0:
        return None
    start = page.rfind('<div class="Table__Row">', 0, i)
    end = page.find('<div class="Table__Row">', i)
    row = page[start:end if end > 0 else i + 3000]
    vals = dict((text(h), text(v)) for h, v in re.findall(
        r'Table__Col--Heading">(.*?)</div>\s*<div class="Table__Col--Content">(.*?)</div>', row, flags=re.S))
    return {'place': num(vals.get('место', '')), 'rating': num(vals.get('Рейтинг', ''))}


# ---------- Прямой эфир: турнир, который идёт сейчас ----------
MSK = timezone(timedelta(hours=3))


def get_any(url):
    """Страницы результатов бывают в cp1251 — определяем кодировку по meta."""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (bridge-sayc trainer)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    head = raw[:4000].lower()
    enc = 'cp1251' if b'1251' in head else 'utf-8'
    return raw.decode(enc, 'replace')


def parse_range(txt, today):
    """«30 октября - 1 ноября», «7 - 8 ноября», «25 октября» → (начало, конец)."""
    parts = [p.strip() for p in html.unescape(txt).split('-')]
    end_m = re.match(r'(\d+)\s+(\S+)', parts[-1])
    if not end_m or end_m.group(2) not in MONTHS:
        return None
    end_month = MONTHS[end_m.group(2)]
    st = re.match(r'(\d+)(?:\s+(\S+))?', parts[0])
    st_month = MONTHS.get(st.group(2), end_month) if st.group(2) else end_month
    best = None
    for y in (today.year - 1, today.year, today.year + 1):
        try:
            s = datetime(y if st_month <= end_month else y - 1, st_month, int(st.group(1)), tzinfo=MSK)
            e = datetime(y, end_month, int(end_m.group(1)), 23, 59, tzinfo=MSK)
        except ValueError:
            continue
        if best is None or abs((s - today).days) < abs((best[0] - today).days):
            best = (s, e)
    return best


def standings_row(page):
    """Строка Ивана в турнирной таблице: место, очки, всего участников."""
    rows = re.split(r'<tr[^>]*>\s*<td[^>]*align=center[^>]*>\s*(\d+)\s*</td>', page, flags=re.I)
    # rows: [мусор, место1, тело1, место2, тело2, ...]
    places = [(int(rows[i]), rows[i + 1]) for i in range(1, len(rows) - 1, 2)]
    for place, body in places:
        if 'Татаркин' in body:
            team = re.search(r'<B>([^<]+)</B>\s*</font>', body, flags=re.I)
            members = re.search(r"<div style='font-size:12px;'>(.*?)</div>", body, flags=re.S | re.I)
            nums = [float(x) for x in re.findall(r'<TD align=right[^>]*>(?:<[^>]+>)*\s*(-?\d+(?:\.\d+)?)', body, flags=re.I)]
            return {'place': place, 'of': len(places), 'team': text(team.group(1)) if team else None,
                    'members': text(members.group(1)) if members else None, 'score': nums[0] if nums else None}
    # запасной вариант: любая строка таблицы с фамилией
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', page, flags=re.S | re.I):
        if 'Татаркин' in tr:
            cells = [text(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, flags=re.S | re.I)]
            ints = [c for c in cells if re.fullmatch(r'\d+', c)]
            decs = [float(c.replace(',', '.')) for c in cells if re.fullmatch(r'-?\d+[.,]\d+', c)]
            return {'place': int(ints[0]) if ints else None, 'of': None, 'team': None, 'members': ', '.join(c for c in cells if 'Татаркин' in c) or None,
                    'score': max(decs) if decs else None}
    return None


def live_check():
    now = datetime.now(MSK)
    cal = get(f'{BASE}/tournaments/calendar/')
    events = re.findall(r'<span>([^<]+)</span>\s*<div[^>]*>\s*<a[^>]*href="(/tournaments/\d+/)"[^>]*>\s*([^<]+)', cal)
    for dates, href, name in events:
        rng = parse_range(dates, now)
        if not rng or not (rng[0] <= now <= rng[1] + timedelta(days=1)):
            continue
        page = get(BASE + href)
        if 'Татаркин И' not in page:
            continue
        result_links = [u for u in re.findall(r'href="(https?://[^"]+\.(?:htm|html|php)[^"]*)"', page)
                        if re.search(r'result|res', u, re.I) and 'bridgesport.ru/materials' not in u]
        live = {'tournament': text(name), 'url': BASE + href, 'dates': text(dates), 'results_url': None,
                'finished': now > rng[1], 'checked': now.strftime('%Y-%m-%dT%H:%M:%S%z')}
        # состав команды прямо со страницы турнира
        i = page.find('Татаркин И')
        block = page[max(0, i - 3000):i]
        tm = re.findall(r'Название команды.*?<[^>]*>\s*([^<]{2,60}?)\s*<', block, flags=re.S)
        if tm:
            live['team'] = text(tm[-1])
        for u in result_links:
            try:
                res = get_any(u)
            except Exception:
                continue
            target, tpage = u, res
            s_link = re.search(r'href="([^"]*s\.htm)"', res, flags=re.I)
            if 'Татаркин' not in res and s_link:
                target = urllib.parse.urljoin(u, s_link.group(1))
                try:
                    tpage = get_any(target)
                except Exception:
                    continue
            elif s_link:
                # на главной странице результатов — текущий тур; таблица — на странице s.htm
                target = urllib.parse.urljoin(u, s_link.group(1))
                try:
                    tpage = get_any(target)
                except Exception:
                    tpage = res
            row = standings_row(tpage)
            if row:
                rounds = re.findall(r'Результаты тура\s*(\d+)', res)
                live.update(row)
                live['results_url'] = target
                live['round'] = int(rounds[-1]) if rounds else None
                break
        return live
    return None


def main():
    full = '--full' in sys.argv
    data = {}
    if os.path.exists(OUT):
        with open(OUT, encoding='utf-8') as f:
            data = json.load(f)
    info, ach, perf, club = parse_player(get(f'{BASE}/players-and-ratings/search-player/{PLAYER_ID}/'))
    history = {h['date']: h for h in data.get('rating_history', [])}
    periods = rating_periods(200 if full else 1)
    for date, url in sorted(periods.items()):
        if date in history:
            continue
        row = rating_row(url)
        if row:
            history[date] = {'date': date, **row}
            print('рейтинг', date, row)
        time.sleep(1)
    try:
        live = live_check()
    except Exception as e:
        print('эфир: ошибка', e)
        live = data.get('live')
    # Трек места по ходу турнира — для графика «прямого эфира»
    track = data.get('live_track', [])
    if live and live.get('place'):
        if not track or track[0].get('tournament') != live['tournament']:
            track = []
        point = {'tournament': live['tournament'], 't': live['checked'], 'place': live['place'], 'score': live.get('score'), 'round': live.get('round')}
        if not track or (track[-1]['place'], track[-1].get('score')) != (point['place'], point['score']):
            track.append(point)
    out = {
        'live': live, 'live_track': track,
        'player_id': PLAYER_ID, 'name': 'Татаркин Иван Владимирович',
        'profile_url': f'{BASE}/players-and-ratings/search-player/{PLAYER_ID}/',
        'info': info, 'achievements': ach, 'performances': perf, 'club_mb': club,
        'rating_history': sorted(history.values(), key=lambda h: h['date']),
    }
    old = {k: v for k, v in data.items() if k != 'updated'}
    if old != out or not data:
        out['updated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        print('обновлено:', len(perf), 'выступлений,', len(history), 'точек рейтинга')
    else:
        print('без изменений')


if __name__ == '__main__':
    main()
