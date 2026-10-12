from pathlib import Path
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=(h/'prepare-play.py').read_text().replace("['movement']","['mission']").replace("['player-render-136']","['overhaul-coop-138']").replace('render136-raster-review.md','coop138-source-review.md')
needle="review=r/'docs/overhaul/critic/coop138-source-review.md';"
assert needle in s
s=s.replace(needle,"actual=r/'docs/overhaul/critic/render136-gameplay-review.md';assert 'RETAIN056' in actual.read_text();"+needle)
(h/'prepare-mission-seal.py').write_text(s)
print('138 mission exact056 binding/conditional seal prepared; job unrun.')
