import Foundation
import AVFoundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO

// All animation is deterministic. Art is raster pixel art; text and sprites stay crisp.
// BEGIN SHARED STORYBOARD READER — keep identical across the three current renderers.
let storyboardURL=URL(fileURLWithPath:ProcessInfo.processInfo.environment["OPENING_STORYBOARD"] ?? "docs/영상-3편-콘티와-대사.md")
let storyboardLines=try String(contentsOf:storyboardURL,encoding:.utf8).components(separatedBy:.newlines)
let storyboardPattern=try NSRegularExpression(pattern: #"^- \*\*([CGL][0-9]{3})\*\*: (.+)$"#)
var storyboardText:[String:String]=[:]
for line in storyboardLines {
    let range=NSRange(line.startIndex...,in:line)
    if let match=storyboardPattern.firstMatch(in:line,range:range),
       let idRange=Range(match.range(at:1),in:line),let textRange=Range(match.range(at:2),in:line) {
        let id=String(line[idRange]),value=String(line[textRange])
        precondition(storyboardText[id]==nil,"Duplicate storyboard ID: \(id)")
        precondition(!value.trimmingCharacters(in:.whitespaces).isEmpty,"Empty storyboard text: \(id)")
        storyboardText[id]=value
    }
}
func scriptText(_ id:String)->String {
    guard let value=storyboardText[id] else {fatalError("Missing storyboard text: \(id). Edit docs/영상-3편-콘티와-대사.md")}
    return value
}
// END SHARED STORYBOARD READER
let requiredScriptIDs=["G001", "G002", "G003", "G004", "G005", "G006", "G007", "G008", "G009", "G010", "G011", "G012", "G013", "G014", "G015", "G016", "G017", "G018", "G019", "G020", "G021", "G022", "G023", "G024", "G025", "G026", "G027", "G028", "G029", "G030", "G031", "G032", "G033", "G034", "G035", "G036", "G037", "G038", "G039", "G040", "G041", "G042", "G043", "G044", "G045", "G046", "G047", "G048", "G049", "G050", "G051", "G052", "G053", "G054", "G055", "G056", "G057", "G058", "G059", "G060"]
for id in requiredScriptIDs {_ = scriptText(id)}
if CommandLine.arguments.contains("--dump-script") {
    let data=try JSONSerialization.data(withJSONObject:Dictionary(uniqueKeysWithValues:requiredScriptIDs.map{($0,scriptText($0))}),options:[.sortedKeys])
    print(String(data:data,encoding:.utf8)!);exit(0)
}
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=URL(fileURLWithPath:ProcessInfo.processInfo.environment["OPENING_OUTPUT_DIR"] ?? root.appendingPathComponent("output/openings/guardian-v1").path)
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let W=1280,H=720,fps:Int32=24,duration=83.0
for name in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    CTFontManagerRegisterFontsForURL(FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(name)") as CFURL,.process,nil)
}
func load(_ name:String)->CGImage {
    let u=root.appendingPathComponent("assets/openings/guardian-v1/\(name).png")
    guard let s=CGImageSourceCreateWithURL(u as CFURL,nil),let im=CGImageSourceCreateImageAtIndex(s,0,nil) else {fatalError("Missing art: \(u.path)")};return im
}
let library=load("guardian-library")
func color(_ hex:Int,_ a:Double=1)->NSColor {NSColor(calibratedRed:Double((hex>>16)&255)/255,green:Double((hex>>8)&255)/255,blue:Double(hex&255)/255,alpha:a)}
let ink=color(0x173D4A),cream=color(0xFFF8DC),mint=color(0xA8E9CF),coral=color(0xF26C68),yellow=color(0xFFD66E),blue=color(0x9ECFEF),night=color(0x111D2B),paper=color(0xF4DFB1)
func clamp(_ x:Double)->Double {min(1,max(0,x))}
func ease(_ x:Double)->Double {let p=clamp(x);return 1-pow(1-p,3)}
func rect(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {c.setFillColor(col.cgColor);c.fill(CGRect(x:round(x),y:round(y),width:round(w),height:round(h)))}
// Wrap edited prose at measured glyph boundaries without changing the source copy.
func copyLines(_ value:String,_ size:Double,_ width:Double)->[String] {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let attr=NSAttributedString(string:value,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font])
    let setter=CTTypesetterCreateWithAttributedString(attr)
    let text=value as NSString
    var offset=0,result:[String]=[]
    while offset<text.length {
        let count=CTTypesetterSuggestLineBreak(setter,offset,width)
        precondition(count>0,"Cannot fit dialogue")
        result.append(text.substring(with:NSRange(location:offset,length:count)).trimmingCharacters(in:.whitespaces))
        offset+=count
    }
    return result
}
func copyWidth(_ value:String,_ size:Double)->Double {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:value,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font]))
    return CTLineGetTypographicBounds(line,nil,nil,nil)
}
func label(_ c:CGContext,_ s:String,_ x:Double,_ y:Double,_ size:Double=36,_ col:NSColor=ink,_ centered:Bool=false,_ maxWidth:Double=1200) {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:s,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:col]))
    let w=CTLineGetTypographicBounds(line,nil,nil,nil)
    precondition(w<maxWidth,"Text overflow \(s): \(w)")
    c.setShouldAntialias(false);c.setShouldSmoothFonts(false);c.textMatrix = .identity
    c.textPosition=CGPoint(x:round(centered ? x-w/2:x),y:round(y));CTLineDraw(line,c)
}
func card(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor=cream) {
    rect(c,x+8,y-8,w,h,ink);rect(c,x,y,w,h,ink);rect(c,x+4,y+4,w-8,h-8,col)
}
func picture(_ c:CGContext,_ im:CGImage,_ box:CGRect) {c.interpolationQuality = .none;c.draw(im,in:box)}
func star(_ c:CGContext,_ x:Double,_ y:Double,_ s:Double,_ col:NSColor) {
    rect(c,x+s*2,y,s,s*5,col);rect(c,x,y+s*2,s*5,s,col);rect(c,x+s,y+s,s*3,s*3,col)
}
let patterns:[String:[String]] = [
"paper":["1111111100","1222222110","1233332221","1222222221","1233333321","1222222221","1233333321","1222222221","1233332221","1222222221","1111111111"],
"chip":["001010100","011111110","112222211","012333210","112323211","012333210","112222211","011111110","001010100"],
"book":["011111110","112222211","122333221","122222221","122333221","122222221","122333221","122222221","111111111","012222221","011111111"],
"coin":["00111100","01222210","12233221","12323231","12323231","12233221","01222210","00111100"],
"case":["0001111000","0001221000","1111111111","1222222221","1222332221","1112331111","1222332221","1222222221","1111111111"],
"cursor":["10000000","11000000","12100000","12210000","12221000","12222100","12211110","12121000","11012100","10012100","00001100"]
]
func sprite(_ c:CGContext,_ name:String,_ x:Double,_ y:Double,_ s:Double,_ tint:NSColor=mint) {
    guard let rows=patterns[name] else{return}
    for (j,row) in rows.enumerated(){for (i,ch) in row.enumerated(){if ch != "0" {rect(c,x+Double(i)*s,y+Double(rows.count-j-1)*s,s,s,ch=="1" ? ink:ch=="2" ? tint:cream)}}}
}
func pop(_ c:CGContext,_ x:Double,_ y:Double,age:Double,_ body:()->Void) {
    let p=ease(age/0.45);if p<=0{return};c.saveGState();c.setAlpha(p);c.translateBy(x:x,y:y-28*(1-p));body();c.restoreGState()
}
func chip(_ c:CGContext,_ x:Double,_ y:Double,_ title:String,_ tint:NSColor=mint,_ size:Double=10) {
    sprite(c,"chip",x-4.5*size,y-4.5*size,size,tint);label(c,title,x,y-4.5*size-34,28,ink,true)
}
func progress(_ c:CGContext,_ t:Double) {
    rect(c,48,666,1184,4,ink.withAlphaComponent(0.15));rect(c,48,666,1184*clamp(t/64),4,coral)
    label(c,scriptText("G001"),50,687,18,ink);label(c,scriptText("G002"),1090,687,18,ink,true)
}
func ticker(_ c:CGContext,_ s:String,_ t:Double) {
    let cycle=max(1280,copyWidth(s,22)+180)
    rect(c,0,0,1280,43,ink)
    let x=1280-(t*65).truncatingRemainder(dividingBy:cycle)
    label(c,s,x,12,22,cream,false,Double.greatestFiniteMagnitude)
    label(c,s,x-cycle,12,22,cream,false,Double.greatestFiniteMagnitude)
}
func heading(_ c:CGContext,_ year:String,_ title:String) {
    card(c,48,574,172,62,yellow);label(c,year,134,590,38,ink,true);label(c,title,253,590,40,ink)
}
func subtitle(_ c:CGContext,_ sourceLines:[String],_ col:NSColor=ink,_ dark:Bool=false) {
    let lines=sourceLines.flatMap{copyLines($0,34,1124)}
    precondition(lines.count<=3,"Subtitle needs a longer scene or a different layout")
    let y=dark ? 55.0:65.0
    if dark {rect(c,48,y-15,1184,Double(lines.count)*46+26,night.withAlphaComponent(0.96))}
    else {card(c,48,y-15,1184,Double(lines.count)*46+26,cream)}
    for (i,s) in lines.enumerated(){label(c,s,78,y+Double(lines.count-1-i)*46,34,col)}
}
func confetti(_ c:CGContext,_ t:Double) {
    for i in 0..<65 {
        let x=Double((i*197)%1280)+sin(t+Double(i))*24
        let y=720-(t*70+Double(i*79)).truncatingRemainder(dividingBy:780)
        rect(c,x,y,i%2==0 ? 8:4,i%2==0 ? 4:12,[coral,yellow,mint,blue][i%4])
    }
}

func banner(_ c:CGContext,_ title:String) {
    card(c,90,552,1100,82,yellow);label(c,title,640,577,42,ink,true)
}
// Deterministic interference covers the whole broadcast, including its branding.
func noise(_ c:CGContext,_ t:Double,_ strength:Double) {
    let frame=Int(t*12)
    for y in stride(from:0,to:720,by:12) {
        for x in stride(from:0,to:1280,by:16) {
            let seed=(x*73+y*151+frame*197+x*y*3)%997
            let v=Double(seed)/997
            rect(c,Double(x),Double(y),16,10,color(seed%2==0 ? 0xB9D6CF:0x071F2C,strength*(0.2+v*0.8)))
        }
    }
    for y in stride(from:0,to:720,by:5) {rect(c,0,Double(y),1280,1,night.withAlphaComponent(0.35))}
    let scan=720-(t*170).truncatingRemainder(dividingBy:790)
    rect(c,0,scan,1280,18,mint.withAlphaComponent(strength*0.25))
}
func interruptedSignal(_ c:CGContext,_ u:Double) {
    if u<0.8 {
        rect(c,0,0,1280,720,night)
        // Different horizontal bands lose sync and slide independently.
        for i in 0..<12 {
            let shift=Double(((i*79+Int(u*12)*47)%131)-65)
            c.saveGState();c.clip(to:CGRect(x:0,y:i*60,width:1280,height:60))
            picture(c,library,CGRect(x:shift,y:0,width:1280,height:720))
            c.restoreGState()
        }
        rect(c,0,0,1280,720,night.withAlphaComponent(0.45))
        noise(c,u,0.65)
        rect(c,190,304,900,110,night.withAlphaComponent(0.95))
        label(c,scriptText("G003"),640,344,40,paper,true)
    } else if u<3.8 {
        rect(c,0,0,1280,720,color(0x07141D))
        noise(c,u,0.35)
        rect(c,120,210,1040,350,night.withAlphaComponent(0.97))
        rect(c,120,552,1040,5,coral)
        label(c,scriptText("G004"),640,506,24,coral,true)
        label(c,scriptText("G005"),640,405,48,paper,true)
        label(c,scriptText("G006"),640,315,54,coral,true)
        label(c,scriptText("G007"),640,118,22,paper,true)
        // Noise stays at the edges so the brief question remains readable.
        for i in 0..<8 {
            let y=Double((i*97+Int(u*12)*13)%190)
            rect(c,Double((i*173)%1100),y,150,3,coral.withAlphaComponent(0.6))
        }
    } else if u<4.65 {
        // Short broadcast calibration frame before the cheerful HUMAN feed returns.
        rect(c,0,0,1280,720,night)
        let bars=[cream,yellow,blue,mint,coral,color(0x8985B2),ink]
        for i in 0..<7 {rect(c,Double(i)*1280/7,170,1280/7+1,550,bars[i].withAlphaComponent(0.8))}
        for i in 0..<16 {rect(c,Double(i)*80,0,80,170,color(i%2==0 ? 0xEEEEDE:0x172D39))}
        card(c,240,260,800,220,cream)
        label(c,scriptText("G008"),640,414,32,ink,true)
        label(c,scriptText("G009"),640,337,52,ink,true)
        label(c,scriptText("G010"),640,286,24,ink,true)
    } else {
        picture(c,library,CGRect(x:0,y:0,width:1280,height:720))
        rect(c,0,0,1280,720,cream.withAlphaComponent(0.36))
        card(c,100,220,1080,350,mint)
        label(c,scriptText("G011"),640,400,44,ink,true)
        label(c,scriptText("G012"),640,315,32,ink,true)
    }
}
func draw(_ c:CGContext,_ t:Double) {
    picture(c,library,CGRect(x:0,y:0,width:1280,height:720))
    rect(c,0,0,1280,720,cream.withAlphaComponent(0.36))
    label(c,scriptText("G013"),50,687,18,ink)
    rect(c,48,666,1184,4,ink.withAlphaComponent(0.15));rect(c,48,666,1184*t/duration,4,coral)
    if t<8 {
        card(c,180,230,920,330,cream)
        label(c,scriptText("G014"),640,463,68,ink,true)
        label(c,scriptText("G015"),640,380,40,ink,true)
        label(c,scriptText("G016"),640,293,28,ink,true)
        confetti(c,t)
        subtitle(c,[scriptText("G017")])
    } else if t<18 {
        let u=t-8;banner(c,scriptText("G018"))
        for i in 0..<3 {
            pop(c,85+Double(i)*410,255,age:u-Double(i)*0.7) {
                card(c,0,0,290,240,[mint,blue,yellow][i])
                sprite(c,"book",100,95,10,[mint,blue,yellow][i])
                label(c,[scriptText("G019"),scriptText("G020"),scriptText("G021")][i],145,40,26,ink,true)
            }
        }
        subtitle(c,u<5 ? [scriptText("G022")]:[scriptText("G023")])
    } else if t<28 {
        let u=t-18;banner(c,scriptText("G024"))
        card(c,180,235,920,280,cream)
        for i in 0..<6 {
            let x=260+Double(i)*135
            sprite(c,"paper",x,340+sin(u+Double(i))*8,7,i%3==0 ? coral:mint)
            if i%3==0 {label(c,scriptText("G025"),x+35,292,42,coral,true)}
        }
        label(c,scriptText("G026"),640,252,28,ink,true)
        subtitle(c,u<5 ? [scriptText("G027"),scriptText("G028")]:[scriptText("G029")])
    } else if t<38 {
        let u=t-28;banner(c,scriptText("G030"))
        card(c,180,230,920,285,mint)
        label(c,scriptText("G031"),640,402,64,ink,true)
        label(c,scriptText("G032"),640,335,30,ink,true)
        label(c,scriptText("G033"),640,267,28,ink,true)
        confetti(c,u);star(c,110,390,9,coral);star(c,1090,315,7,yellow)
        subtitle(c,[scriptText("G034")])
    } else if t<51 {
        let u=t-38;banner(c,scriptText("G035"))
        card(c,75,230,540,290,cream);card(c,665,230,540,290,blue)
        label(c,scriptText("G036"),345,472,28,ink,true)
        label(c,scriptText("G037"),345,406,44,ink,true)
        label(c,u>5 ? scriptText("G038"):scriptText("G039"),115,337,30,ink)
        label(c,u>8 ? scriptText("G040"):scriptText("G041"),115,280,30,ink)
        label(c,scriptText("G042"),935,472,28,ink,true)
        label(c,scriptText("G043"),935,390,28,ink,true)
        label(c,scriptText("G044"),935,329,28,ink,true)
        if u>9 {star(c,537,285,5,coral);label(c,scriptText("G045"),935,259,30,ink,true)}
        subtitle(c,u<5 ? [scriptText("G046")]:[scriptText("G047")])
    } else if t<62 {
        let u=t-51;banner(c,scriptText("G048"))
        card(c,280,232,720,285,u<4 ? cream:mint)
        label(c,scriptText("G037"),640,435,48,ink,true)
        if u<4 {
            label(c,scriptText("G049"),640,365,30,coral,true)
            for i in 0..<4 {rect(c,410+Double(i%2)*35,270+Double(i)*17,440-Double(i)*48,8,coral)}
        } else {
            label(c,scriptText("G050"),640,365,34,ink,true)
            label(c,scriptText("G051"),640,285,38,ink,true)
            star(c,330,305,6,yellow);star(c,895,400,5,coral)
        }
        subtitle(c,u<4 ? [scriptText("G052")]:[scriptText("G053")])
    } else if t<69 {
        let u=t-62;banner(c,scriptText("G054"))
        for i in 0..<8 {
            let active=u>Double(i)*0.45
            let x=70+Double(i)*151
            card(c,x,320,125,135,active ? mint:cream)
            sprite(c,"book",x+38,365,5,active ? yellow:blue)
            label(c,"\(1910+i*10)",x+62,337,24,ink,true)
        }
        label(c,scriptText("G055"),640,252,32,ink,true)
        subtitle(c,[scriptText("G056")])
    } else if t<77 {
        interruptedSignal(c,t-69)
    } else {
        let u=t-77
        card(c,150,238,980,320,yellow)
        label(c,scriptText("G057"),640,460,48,ink,true)
        label(c,scriptText("G031"),640,375,58,ink,true)
        label(c,scriptText("G058"),640,298,30,ink,true)
        confetti(c,u)
        subtitle(c,[scriptText("G059")])
    }
    if t<69 || t>=77 {ticker(c,scriptText("G060"),t)}
    let fade=min(1,t/0.35)*min(1,max(0,(duration-t)/0.5))
    if fade<1 {rect(c,0,0,1280,720,cream.withAlphaComponent(1-fade))}
}
// A single real rendered frame, without touching the existing movie.
if let index=CommandLine.arguments.firstIndex(of:"--preview-at") {
    precondition(index+1<CommandLine.arguments.count,"Missing preview time")
    let second=Double(CommandLine.arguments[index+1])!
    precondition(second>=0 && second<duration,"Preview time outside film")
    let context=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    draw(context,second)
    let target=CGImageDestinationCreateWithURL(out.appendingPathComponent("preview.png") as CFURL,"public.png" as CFString,1,nil)!
    CGImageDestinationAddImage(target,context.makeImage()!,nil)
    precondition(CGImageDestinationFinalize(target),"Preview write failed")
    print("Preview ready");exit(0)
}
if CommandLine.arguments.contains("--stills") {
    for t in [21.0,73.1,74.0,75.0,76.5,79.0] {
        let c=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        draw(c,t)
        let d=CGImageDestinationCreateWithURL(URL(fileURLWithPath:"/tmp/guardian-preview-\(t).png") as CFURL,"public.png" as CFString,1,nil)!
        CGImageDestinationAddImage(d,c.makeImage()!,nil);CGImageDestinationFinalize(d)
    }
    print("Preview frames ready in /tmp");exit(0)
}
let final=out.appendingPathComponent("guardian-v1-no-voice.mp4")
try? FileManager.default.removeItem(at:final)
let writer=try AVAssetWriter(outputURL:final,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:4_500_000,AVVideoMaxKeyFrameIntervalKey:48]])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input);guard writer.startWriting() else{fatalError(String(describing:writer.error))};writer.startSession(atSourceTime:.zero)
for f in 0..<Int(duration*Double(fps)) {
    while !input.isReadyForMoreMediaData {if writer.status == .failed {fatalError(String(describing:writer.error))};Thread.sleep(forTimeInterval:0.002)}
    autoreleasepool {
        var b:CVPixelBuffer?;CVPixelBufferPoolCreatePixelBuffer(nil,adaptor.pixelBufferPool!,&b)
        let buffer=b!;CVPixelBufferLockBaseAddress(buffer,[])
        let c=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        draw(c,Double(f)/Double(fps));CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else {fatalError("append failed")}
    }
    if f%240==0 {print("Rendered \(f)/\(Int(duration*Double(fps)))");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError(String(describing:writer.error))}
let result=AVURLAsset(url:final)
print("DONE \(final.path) duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count)")
