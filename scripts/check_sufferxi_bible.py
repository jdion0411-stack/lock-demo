"""Validate chapter/verse coverage and integration against the source KJV file."""
import hashlib,json,pathlib,re,sys
from html.parser import HTMLParser
from html import unescape
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]);books=json.loads(source.read_text(encoding='utf-8-sig'))
folder=root/'assets/sufferxi-bible';manifest=json.loads((folder/'manifest.json').read_text())
assert manifest['source_sha256']==hashlib.sha256(source.read_bytes()).hexdigest()
assert len(manifest['books'])==66
for raw,entry in zip(books,manifest['books']):
 assert raw['name']==entry['name']
 assert len(raw['chapters'])==entry['chapters']
 assert sum(map(len,raw['chapters']))==entry['verses']
 if 'file' not in entry:continue
 payload=json.loads((folder/entry['file']).read_text());chapters=payload['chapters']
 assert payload['name']==entry['name'] and payload['status']=='draft'
 assert list(chapters)==[str(i) for i in range(1,len(raw['chapters'])+1)]
 for c,verses in enumerate(raw['chapters'],1):
  output=chapters[str(c)];assert len(output)==len(verses)
  for v,item in enumerate(output,1):
   assert item['n']==f'{c}:{v}' and item['text'].strip()
   assert '<script' not in item['text'] and '{' not in item['text']
   # The adaptation must not change or drop any numerical quantities.
   assert re.findall(r'\d+',verses[v-1])==[n for n in re.findall(r'\b\d+\b',item['text']) if n not in ('2','4')], (entry['name'],c,v)
site=(root/'index.html').read_text();m=re.search(r'data-srcdoc="([^"]*)"',site);reader=unescape(m[1])
class Data(HTMLParser):
 def __init__(self):super().__init__();self.on=False;self.data=''
 def handle_starttag(self,t,a):
  if dict(a).get('id')=='eota-test-data':self.on=True
 def handle_data(self,d):
  if self.on:self.data+=d
 def handle_endtag(self,t):
  if t=='script':self.on=False
p=Data();p.feed(reader);genesis=json.loads(p.data)
assert len(genesis)==50 and sum(map(len,genesis.values()))==1533
existing=json.loads(re.search(r'const previewCollections=(.*?);previewCollections.Genesis=',reader,re.S)[1])['Exodus']
assert len(existing)==40 and sum(map(len,existing.values()))==1213
assert len(books)==66 and sum(len(b['chapters']) for b in books)==1189
assert sum(sum(map(len,b['chapters'])) for b in books)==31102
for name in [b['name'] for b in books]:assert name in reader
print('PASS: 66 books, 1,189 chapters, 31,102 verses; Genesis/Exodus retained; every new verse present and nonempty.')
