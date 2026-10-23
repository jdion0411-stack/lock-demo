"""Build a complete, explicitly draft slang adaptation from the public-domain KJV.
Existing Genesis and Exodus are retained by the reader. This is a deterministic
vocabulary adaptation, not a scholarly translation or a verse-by-verse review.
Usage: python scripts/build_sufferxi_bible.py /path/to/en_kjv.json
Source: https://github.com/thiagobodruk/bible/blob/master/json/en_kjv.json
"""
import collections, hashlib, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
books = json.loads(source.read_text(encoding='utf-8-sig'))
# Whole words only; names, quantities, theological terms and verse order remain.
WORDS = dict(pair.split('=', 1) for pair in '''the=tha
and=N
with=wit
you=u
your=ur
yours=urz
yourself=urself
yourselves=y’all
thou=u
thee=u
thy=ur
thyself=urself
thine=urs
ye=y’all
art=are
hast=have
hath=has
dost=do
doth=does
wilt=will
shalt=will
unto=2
to=2
for=4
into=in2
are=r
them=’em
they=dey
this=dis
that=dat
these=dese
those=dose
thus=like dis
behold=look
lo=look
verily=for real
yea=yeah
nay=no
saith=says
saidst=said
spake=spoke
spakest=spoke
speakest=speak
shew=show
shewed=showed
shewn=shown
sheweth=shows
shewest=show
shewbread=showbread
wherefore=so
wherein=in which
therein=in it
thereof=of it
therewith=wit it
therefrom=from there
thereby=by dat
herein=in dis
hereby=by dis
hither=here
thither=there
whither=where
whence=from where
henceforth=from now on
hitherto=until now
heretofore=before now
forthwith=right away
straightway=right away
immediately=right away
peradventure=maybe
haply=maybe
howbeit=but
albeit=even though
notwithstanding=even so
inasmuch=since
lest=so dat not
brethren=brothers
brethren’s=brothers’
begat=fathered
begotten=begotten
wroth=angry
waxed=grew
wax=grow
waxeth=grows
raiment=clothing
apparel=clothing
victuals=food
meat=food
sore=deeply
smitten=struck
smote=struck
smite=strike
smotest=struck
slay=kill
slew=killed
slain=killed
enemy=opp
enemies=opps
foe=opp
foes=opps
multitude=crowd
multitudes=crowds
murmur=grumble
murmured=grumbled
murmuring=grumblin
murmurings=grumblin
hearken=listen
hearkened=listened
hearkeneth=listens
hearest=hear
heareth=hears
hearkening=listening
beseech=beg
beseeched=begged
bade=told
biddeth=tells
bid=ask
abode=stayed
dwelt=lived
dwell=live
dwelling=livin
dwelleth=lives
sojourn=stay
sojourned=stayed
sojourning=stayin
sojourneth=stays
woe=woe
whosoever=whoever
whoso=whoever
whatsoever=whatever
wheresoever=wherever
whithersoever=wherever
whomsoever=whoever
aught=anything
nought=nothing
aughtest=ought
oughtest=ought
mayest=may
mightest=might
shouldest=should
wouldest=would
couldest=could
canst=can
hadst=had
didst=did
wast=were
wert=were
gavest=gave
madest=made
sawest=saw
knewest=knew
heardest=heard
broughtest=brought
camest=came
wentest=went
barest=bore
bare=bore
brake=broke
spit=spit
wist=knew
wot=know
wotteth=knows
durst=dared
holpen=helped
gat=got
gettest=get
getteth=gets
gotten=got
an=an
namez=namez
names=namez
waters=waterz
heavens=heavenz
cities=citiez
coming=comin
going=goin
saying=sayin
speaking=speakin
walking=walkin
running=runnin
crying=cryin
weeping=weepin
mourning=mournin
looking=lookin
hearing=hearin
seeing=seein
standing=standin
sitting=sittin
seeking=seekin
calling=callin
singing=singin
rejoicing=rejoicin
waiting=waitin
sleeping=sleepin
eating=eatin
drinking=drinkin
working=workin
fighting=fightin
teaching=teachin
preaching=preachin
praying=prayin
returning=returnin
rising=risin
falling=fallin
bearing=bearin
carrying=carryin
bringing=bringin
gathering=gatherin
scattering=scatterin
turning=turnin
burning=burnin
shining=shinin
serving=servin
keeping=keepin
watching=watchin
answering=answerin
reaping=reapin
sowing=sowin
knowing=knowin
thinking=thinkin
believing=believin
loving=lovin
hating=hatin
following=followin
leaving=leavin
receiving=receivin
giving=givin
taking=takin
making=makin
doing=doin
willing=willin
worshipping=worshippin
worshiping=worshipin
judging=judgin
suffering=sufferin
enduring=endurin
persecuting=persecutin
boasting=boastin
trusting=trustin
reigning=reignin
fearing=fearin
bowing=bowin
lifting=liftin
stretching=stretchin
trembling=tremblin
troubling=troublin
stumbling=stumblin
raging=ragin
mocking=mockin
laughing=laughin
leading=leadin
feeding=feedin
healing=healin
casting=castin
building=buildin
selling=sellin
buying=buyin
fleeing=fleein
searching=searchin
wanting=wantin
having=havin
living=livin
moving=movin
being=bein
lying=lyin
dying=dyin
hiding=hidin
riding=ridin
cutting=cuttin
putting=puttin
setting=settin
letting=lettin
smiting=strikin
saluting=greetin
salute=greet
saluted=greeted
salutations=greetings
salutation=greeting
repentance=repentance'''.splitlines())
# Explicit conjugations avoid suffix guesses that would damage names like Seth.
BASES = '''come:comes go:goes make:makes give:gives know:knows live:lives do:does bring:brings take:takes speak:speaks love:loves endure:endures dwell:lives lie:lies eat:eats see:sees hear:hears keep:keeps believe:believes seek:seeks sit:sits walk:walks receive:receives work:works touch:touches pass:passes look:looks turn:turns cause:causes die:dies remain:remains stand:stands abide:abides hate:hates call:calls put:puts seem:seems fall:falls find:finds cover:covers bear:bears kill:kills set:sets sin:sins enter:enters belong:belongs fear:fears commit:commits burn:burns rejoice:rejoices fail:fails lay:lays open:opens gather:gathers desire:desires judge:judges trust:trusts drink:drinks hide:hides teach:teaches break:breaks cast:casts offer:offers regard:regards send:sends follow:follows increase:increases cry:cries become:becomes sow:sows spread:spreads reach:reaches rise:rises lead:leads rule:rules delight:delights grow:grows sojourn:stays cleave:clings reign:reigns answer:answers deliver:delivers flow:flows command:commands draw:draws swear:swears smite:strikes mourn:mourns arise:arises understand:understands run:runs wait:waits overcome:overcomes divide:divides appear:appears proceed:proceeds tread:treads deal:deals lift:lifts trouble:troubles devour:devours pour:pours scatter:scatters cease:ceases serve:serves ask:asks build:builds get:gets hold:holds perish:perishes bind:binds haste:hurries utter:utters shine:shines exalt:exalts honour:honors consider:considers chew:chews pursue:pursues defile:defiles refuse:refuses destroy:destroys flee:flees mean:means stir:stirs raise:raises search:searches wither:withers shut:shuts depart:departs preserve:preserves devise:devises feed:feeds languish:languishes pertain:pertains ride:rides curse:curses reproach:reproaches bless:blesses care:cares want:wants use:uses save:saves tell:tells pray:prays sleep:sleeps humble:humbles shake:shakes travail:labors stretch:stretches strengthen:strengthens melt:melts return:returns fade:fades prophesy:prophesies creep:creeps sell:sells tear:tears ail:ails piss:pisses think:thinks escape:escapes worship:worships forsake:forsakes fill:fills wander:wanders reward:rewards cut:cuts profit:profits leave:leaves execute:executes flatter:flatters reveal:reveals deceive:deceives happen:happens persecute:persecutes'''
for entry in BASES.split():
    base, third = entry.split(':')
    stem = base[:-1] if base.endswith('e') else base
    archaic = stem + 'eth'
    if base.endswith('y') and base[-2] not in 'aeiou': archaic = base[:-1] + 'ieth'
    if base in {'sit','put','set','run','get','sin','commit','shut','cut','worship'}: archaic = base + base[-1] + 'eth'
    WORDS[archaic] = third
    second = (base[:-1] if base.endswith('e') else base) + 'est'
    if base in {'sit','put','set','run','get','sin','shut','cut'}: second = base + base[-1] + 'est'
    WORDS[second] = base
# Ambiguous words are retained rather than blindly changing their meaning.
for ambiguous in ('art','bare','sore','bid','lest','wax','wilt','thine'):
    WORDS.pop(ambiguous, None)
PHRASES = [
    ('thou art', 'u r'), ('art thou', 'r u'), ('thou wilt', 'u will'), ('wilt thou', 'will u'),
    ('it came to pass', 'it happened'), ('it shall come to pass', 'it will happen'),
    ('it cometh to pass', 'it happens'), ('and it shall be', 'and it will be'),
    ('answered and said', 'answered'), ('lifted up his voice', 'raised his voice'),
    ('lifted up their voices', 'raised their voices'), ('take heed', 'pay attention'),
    ('give ear', 'listen up'), ('be not afraid', 'don’t be afraid'),
    ('fear not', 'don’t fear'), ('be not', 'don’t be'),
    ('let not', 'don’t let'), ('unto thee', 'to you'),
    ('unto you', 'to you'), ('unto them', 'to them'),
    ('thee and thou', 'you and you'), ('thine own', 'your own'),
    ('mine own', 'my own'), ('thine eyes', 'your eyes'), ('mine eyes', 'my eyes'),
    ('do ye', 'do y’all'), ('ye do', 'y’all do'),
]
PROTECTED = {'Beth','Seth','Nazareth','Elisabeth','Mephibosheth','Azmaveth','Bosheth'}
def adapt(text):
    # Braces in this source mark italicized words, not omitted Scripture.
    text = re.sub(r'\{([^{}]*)\}', r'\1', text)
    for old, new in PHRASES:
        text = re.sub(r'\b'+re.escape(old)+r'\b', new, text, flags=re.I)
    def word(m):
        token=m[0]
        if token in PROTECTED: return token
        replacement=WORDS.get(token.lower())
        if replacement is None: return token
        # Preserve sacred-name typography; keep the established slang casing.
        if token == 'LORD': return token
        return replacement
    text = re.sub(r"[A-Za-z]+(?:[’'][A-Za-z]+)?", word, text)
    text = re.sub(r'\s+([,.;:!?])', r'\1', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if text and text[0].islower() and not text.startswith(('u ', 'u,', 'u;', 'u:', 'u.', 'y’all')): text=text[0].upper()+text[1:]
    return text
out = ROOT/'assets/sufferxi-bible'
out.mkdir(parents=True,exist_ok=True)
manifest={'version':'sufferxi-draft-1','status':'draft','source':'King James Version (public domain)','source_url':'https://github.com/thiagobodruk/bible/blob/master/json/en_kjv.json','source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Vocabulary and phrase adaptation matching the site’s Exodus-style slang. Not a scholarly translation; verse-by-verse editorial review is outstanding.','books':[]}
for number,b in enumerate(books,1):
    entry={'name':b['name'],'chapters':len(b['chapters']),'verses':sum(map(len,b['chapters']))}
    if number>2:
        slug=f'{number:02d}-'+re.sub('[^a-z0-9]+','-',b['name'].lower()).strip('-')
        chapters={str(c):[{'n':f'{c}:{v}','text':adapt(text)} for v,text in enumerate(ch,1)] for c,ch in enumerate(b['chapters'],1)}
        payload={'name':b['name'],'status':'draft','chapters':chapters}
        entry['file']=slug+'.json'
        (out/entry['file']).write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
    else: entry['status']='existing-site-text'
    manifest['books'].append(entry)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(books)-2} draft books; {sum(b["chapters"] for b in manifest["books"][2:])} chapters; {sum(b["verses"] for b in manifest["books"][2:])} verses.')
