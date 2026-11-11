import io,requests
from PIL import Image
from pathlib import Path
u="https://export-download.canva.com/12b343cb-28f4-40d2-9ea1-8dc1ede3ad0f/0/0001-4606578307114009134.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH4R7NKVBA%2F20261110%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261110T090336Z&X-Amz-Expires=60303&X-Amz-Signature=85dfacb32559a2452af5660c480cee26bd0363a5512a7a6ffc0d3043ae11bcb0&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Wed%2C%2011%20Nov%202026%2001%3A48%3A39%20GMT"
r=requests.get(u,timeout=50);r.raise_for_status()
im=Image.open(io.BytesIO(r.content)).convert('RGBA')
print('Canva image:',im.size)
boxes={'lipstick':(20,245,620,490),'makeup':(645,245,1250,490),'perfume':(20,585,620,830),'hilal':(645,585,1250,830),'ittihad':(20,925,620,1180),'ahli':(645,925,1250,1180)}
p=Path('public/assets/royal-frames');p.mkdir(parents=True,exist_ok=True)
for n,b in boxes.items():
  crop=im.crop(b)
  crop.save(p/(n+'.png'),optimize=True)
