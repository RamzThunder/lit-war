"""Render the pixel edition from the established Luddite timeline (macOS)."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess

root = Path(__file__).resolve().parents[2]
scripts = root / "scripts/openings"
destination = root / "output/openings/luddite-pixel-v11"
destination.mkdir(parents=True, exist_ok=True)
timeline = (scripts / "render-luddite-v10.swift").read_text().split('if CommandLine.arguments.contains("--stills")')[0]
timeline = timeline.replace('output/openings/luddite-v10','output/openings/luddite-pixel-v11')
timeline = timeline.replace('let s=CGImageSourceCreateWithURL(assets.appendingPathComponent(name) as CFURL,nil)!','let url = name == "resistance-archive.png" ? root.appendingPathComponent("assets/openings/common-propaganda-v3/human-room.png") : assets.appendingPathComponent(name)\n    let s=CGImageSourceCreateWithURL(url as CFURL,nil)!')
timeline = timeline.replace('background(c,room,t,0.78)','background(c,shelter,t,0.38)').replace('t<73 {staticNoise','t<65 {staticNoise')
# Rasterize the machine and both rooms on a game-resolution canvas. The
# dialogue and interactive overlays are drawn afterwards at display resolution.
pixel = """
func pixelLayer(_ target: CGContext, _ paint: (CGContext) -> Void) {
    let width = 320, height = 180
    let layer = CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
    layer.scaleBy(x:0.25,y:0.25)
    paint(layer)
    let bytes = layer.data!.assumingMemoryBound(to:UInt8.self)
    for index in stride(from:0,to:width*height*4,by:4) {
        let r=Int(bytes[index]), g=Int(bytes[index+1]), b=Int(bytes[index+2])
        let warm = r > b && r > g
        let light = (r*3+g*6+b)/10
        let ramp = warm ? warmRamp : coolRamp
        let rgb = ramp[min(ramp.count-1, light*ramp.count/256)]
        bytes[index]=UInt8(rgb >> 16)
        bytes[index+1]=UInt8((rgb >> 8) & 255)
        bytes[index+2]=UInt8(rgb & 255)
    }
    target.saveGState()
    target.interpolationQuality = .none
    target.draw(layer.makeImage()!,in:CGRect(x:0,y:0,width:1280,height:720))
    target.restoreGState()
}
let warmRamp=[0x110f1c,0x261727,0x45303b,0x60404a,0x80504b,0x9e6552,0xb98059,0xd49563,0xe6b174,0xf2cb8e,0xf9dfa8,0xffedc8]
let coolRamp=[0x090e1b,0x111c30,0x1d3046,0x294359,0x36576b,0x486779,0x537c87,0x66949c,0x83afb2,0xa3cdcb,0xc0e4de,0xe3f3e9]
"""
timeline = timeline.replace('func machineScene',pixel+'\nfunc machineScene').replace('{ExtractionScene.draw(c,u)}','{pixelLayer(c) { ExtractionScene.draw($0,u) }}')
for fn, args in [('background','image,t,shade'),('worlds','t,reveal')]:
    start=timeline.index('func '+fn+'(')
    brace=timeline.index('{',start)
    signature=timeline[start:brace]
    timeline=timeline[:start]+signature+'{pixelLayer(c) { '+fn+'Source($0,'+args+') }}\n'+timeline[start:].replace('func '+fn+'(','func '+fn+'Source(',1)
writer = (scripts / "render-common-propaganda-v3.swift").read_text().split('let final=out.appendingPathComponent',1)[1]
writer = 'let final=out.appendingPathComponent'+writer.replace('common-propaganda-v3-no-voice.mp4','luddite-pixel-v11.mp4').replace('2928','1896')
with TemporaryDirectory() as tmp:
    source=Path(tmp)/'main.swift'
    exe=Path(tmp)/'render'
    source.write_text(timeline+writer)
    subprocess.run(['swiftc','-O','-suppress-warnings','-module-cache-path','/private/tmp/lit-war-swift-cache',str(source),'-o',str(exe)],check=True)
    subprocess.run([str(exe)],cwd=root,check=True)
