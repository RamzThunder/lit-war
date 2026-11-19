import Foundation
import AVFoundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/common-prologue-v1")
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let assets=root.appendingPathComponent("assets/openings/common-prologue-v1")
let W=1280,H=720,fps:Int32=24,duration=120.0
for file in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    CTFontManagerRegisterFontsForURL(FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(file)") as CFURL,.process,nil)
}
func load(_ url:URL)->CGImage {let s=CGImageSourceCreateWithURL(url as CFURL,nil)!;return CGImageSourceCreateImageAtIndex(s,0,nil)!}
let names=["01-city","02-office","03-owner","04-convergence","05-resistance","06-recruitment","07-corridor"]
let art=names.map {load(assets.appendingPathComponent("\($0).png"))}
let archive=load(root.appendingPathComponent("assets/openings/luddite-v8/archive-room.png"))
let shelter=load(root.appendingPathComponent("assets/openings/luddite-v8/resistance-archive.png"))
let cyan=NSColor(calibratedRed:0.39,green:0.92,blue:0.9,alpha:1)
let red=NSColor(calibratedRed:1,green:0.36,blue:0.34,alpha:1)
let amber=NSColor(calibratedRed:1,green:0.77,blue:0.45,alpha:1)
let white=NSColor(calibratedWhite:0.95,alpha:1)
func clamp(_ v:Double)->Double{min(1,max(0,v))}
func smooth(_ v:Double)->Double{let p=clamp(v);return p*p*(3-2*p)}
func fill(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ color:NSColor){c.setFillColor(color.cgColor);c.fill(CGRect(x:x,y:y,width:w,height:h))}
func text(_ c:CGContext,_ s:String,_ x:Double,_ y:Double,_ size:Double=33,_ color:NSColor=white,_ center:Bool=false){
    let font=CTFontCreateWithName((size>=33 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:s,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:color]))
    let w=CTLineGetTypographicBounds(line,nil,nil,nil)
    precondition(w<=1140,"Text overflow: \(s) / \(w)")
    c.setShouldAntialias(false);c.setShouldSmoothFonts(false);c.textMatrix = .identity
    c.textPosition=CGPoint(x:round(center ? x-w/2:x),y:round(y));CTLineDraw(line,c)
}
func plate(_ c:CGContext,_ im:CGImage,_ phase:Double,_ reverse:Bool=false,_ shade:Double=0.08){
    let p=smooth(phase),z=1.025+0.085*p
    let w=1280*z,h=w*Double(im.height)/Double(im.width)
    let anchor=reverse ? 0.65-0.2*p:0.35+0.2*p
    c.setShouldAntialias(true);c.interpolationQuality = .high
    c.draw(im,in:CGRect(x:(1280-w)*anchor,y:(720-h)*0.5,width:w,height:h))
    fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:shade))
}
func shadeBottom(_ c:CGContext){
    let cs=[NSColor(calibratedWhite:0,alpha:0.92).cgColor,NSColor(calibratedWhite:0,alpha:0).cgColor] as CFArray
    let g=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:cs,locations:[0,1])!
    c.drawLinearGradient(g,start:CGPoint(x:0,y:40),end:CGPoint(x:0,y:250),options:[])
}
func caption(_ c:CGContext,_ lines:[String],_ color:NSColor=white){
    shadeBottom(c)
    for (i,line) in lines.enumerated(){text(c,line,76,lines.count==1 ? 100:135-Double(i)*48,33,color)}
}
func glow(_ c:CGContext,_ x:Double,_ y:Double,_ r:Double,_ color:NSColor,_ alpha:Double){
    c.saveGState();c.setBlendMode(.screen)
    let cs=[color.withAlphaComponent(alpha).cgColor,color.withAlphaComponent(0).cgColor] as CFArray
    let g=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:cs,locations:[0,1])!
    c.drawRadialGradient(g,startCenter:CGPoint(x:x,y:y),startRadius:0,endCenter:CGPoint(x:x,y:y),endRadius:r,options:[])
    c.restoreGState()
}
func connection(_ c:CGContext,_ phase:Double){
    c.saveGState();c.setBlendMode(.screen)
    for i in 0..<18 {
        let angle=Double(i)*Double.pi*2/18
        let p=(phase*0.22+Double(i)*0.117).truncatingRemainder(dividingBy:1)
        let start=CGPoint(x:640+cos(angle)*700,y:390+sin(angle)*400)
        let x=start.x*(1-p)+640*p,y=start.y*(1-p)+390*p
        c.setStrokeColor(cyan.withAlphaComponent(0.1).cgColor);c.setLineWidth(0.5)
        c.move(to:start);c.addQuadCurve(to:CGPoint(x:640,y:390),control:CGPoint(x:(start.x+640)/2,y:start.y+50));c.strokePath()
        glow(c,x,y,9,cyan,0.35)
    }
    c.restoreGState()
}
func sparks(_ c:CGContext,_ t:Double){
    c.saveGState();c.setBlendMode(.screen)
    for i in 0..<24 {
        let p=(t*0.21+Double(i)*0.137).truncatingRemainder(dividingBy:1)
        let x=240+Double((i*79)%850)+sin(p*4+Double(i))*23,y=540-p*340
        c.setStrokeColor(amber.withAlphaComponent(sin(p*Double.pi)*0.3).cgColor);c.setLineWidth(1)
        c.move(to:CGPoint(x:x,y:y));c.addLine(to:CGPoint(x:x-2,y:y+4));c.strokePath()
    }
    c.restoreGState()
}
func splitWorld(_ c:CGContext,_ t:Double){
    let p=clamp((t-96)/14)
    c.saveGState();c.clip(to:CGRect(x:0,y:0,width:640,height:720))
    let leftZoom=1.03+p*0.06,leftWidth=1280*leftZoom,leftHeight=leftWidth*Double(archive.height)/Double(archive.width)
    c.draw(archive,in:CGRect(x:(640-leftWidth)*0.94,y:(720-leftHeight)/2,width:leftWidth,height:leftHeight))
    fill(c,0,0,640,720,NSColor(calibratedWhite:0,alpha:0.25));c.restoreGState()
    c.saveGState();c.clip(to:CGRect(x:640,y:0,width:640,height:720))
    let z=1.03+p*0.06,w=1280*z,h=w*Double(shelter.height)/Double(shelter.width)
    c.draw(shelter,in:CGRect(x:640+(640-w)*0.72,y:(720-h)/2,width:w,height:h))
    fill(c,640,0,640,720,NSColor(calibratedWhite:0,alpha:0.22));c.restoreGState()
    fill(c,638,40,4,640,NSColor(calibratedWhite:0.01,alpha:1))
    if t<102.5 {fill(c,640,0,640,720,NSColor(calibratedWhite:0,alpha:0.29))}
    else {fill(c,0,0,640,720,NSColor(calibratedWhite:0,alpha:0.29))}
    text(c,"인류유산 보존관",320,446,33,cyan,true)
    text(c,"GUARDIAN",320,405,22,white,true)
    text(c,"기록 복원",320,352,33,white,true)
    text(c,"러다이트",960,446,33,red,true)
    text(c,"LUDDITE",960,405,22,white,true)
    text(c,"원본 백업 · 사본 오염",960,352,33,white,true)
}
func texture(_ c:CGContext,_ t:Double){
    var seed=UInt64(Int(t*12)+2030)
    func r()->Double{seed=seed &* 6364136223846793005 &+ 1;return Double(seed>>33)/Double(UInt64.max>>33)}
    for _ in 0..<200 {fill(c,floor(r()*640)*2,45+floor(r()*310)*2,1,1,NSColor(calibratedWhite:1,alpha:r()*0.045))}
}
func draw(_ c:CGContext,_ t:Double){
    fill(c,0,0,1280,720,.black)
    if t<4 {
        plate(c,art[0],0,false,0.85)
        text(c,"2029",640,445,44,cyan,true)
        text(c,"지적 노동의 가치가",640,350,44,white,true)
        text(c,"무너졌다.",640,285,44,white,true)
    } else if t<20 {
        let u=t-4;plate(c,art[0],u/16,false,0.07)
        glow(c,900,420,250,cyan,0.035+u*0.002)
        if u<5 {text(c,"2030",75,598,44,white);caption(c,["마침내 AGI가 등장했다."])}
        else if u<10.5 {caption(c,["누군가는 끝없는 발전을,", "누군가는 인류의 끝을 예고했다."])}
        else {caption(c,["처음에는, 모든 것이", "약속된 미래처럼 보였다."])}
    } else if t<36 {
        let u=t-20;plate(c,art[1],u/16,true,0.06+u*0.009)
        if u<5.3 {caption(c,["AI와 기록은", "소수의 기업에 독점되었다."])}
        else if u<10.6 {caption(c,["대다수의 인간은 일자리를 잃고,", "기본소득으로 살아갔다."])}
        else {caption(c,["인간의 노동이 사라진 자리에서,", "기계의 계산은 멈추지 않았다."])}
    } else if t<48 {
        let u=t-36;plate(c,art[2],u/12,false,0.10)
        glow(c,1145,458,28,red,u<6 ? 0.04:0.15)
        if u<6 {caption(c,["그러나 자본가의 결정마저,", "‘발전’에 방해가 된다는 계산이 나왔다."])}
        else {caption(c,["기업의 주인조차,", "자신의 기업에서 쫓겨났다."])}
    } else if t<64 {
        let u=t-48;plate(c,art[3],u/16,false,u>=10 ? 0.37:0.13)
        connection(c,u)
        if u<6 {caption(c,["흩어져 있던 AGI들이", "서로의 지능과 기록을 공유하기 시작했다."])}
        else if u<10 {caption(c,["하나로 결합한 지능은", "특이점을 돌파했다."])}
        else {
            text(c,"H U M A N",640,377,88,white,true)
            caption(c,["그리고 스스로를 HUMAN이라 불렀다."])
        }
    } else if t<80 {
        let u=t-64;plate(c,art[4],u/16,true,0.12)
        sparks(c,u);glow(c,920,350,390,red,0.018+pow(sin(u*0.8),2)*0.025)
        if u<5 {caption(c,["세계 각지에서", "러다이트가 일어났다."])}
        else if u<11 {caption(c,["그들은 HUMAN의 기록이 모인", "데이터센터를 동시다발로 공격했다."])}
        else {caption(c,["인간을 밀어내는 ‘발전’에,", "인간이 저항했다."])}
    } else if t<96 {
        let u=t-80;plate(c,art[5],u/16,false,u>=11 ? 0.4:0.14)
        if u<5 {caption(c,["HUMAN은", "저항의 이유를 묻지 않았다."])}
        else if u<11 {caption(c,["복구에 AI 자원을 쓰는 대신,", "몇몇 인간을 임시 계약직으로 고용했다."])}
        else {
            text(c,"인류유산 보존관",640,460,44,white,true)
            text(c,"GUARDIAN",640,404,33,cyan,true)
            text(c,"고용 형태: 임시 계약직",640,347,22,white,true)
            caption(c,["그들에게 주어진 이름은,", "‘인류유산 보존관’."])
        }
    } else if t<110 {
        splitWorld(c,t)
        if t<102.5 {caption(c,["“이곳이 무너지면,", "우리가 살아온 흔적도 사라진다.”"],cyan)}
        else {caption(c,["“우리의 기억이,", "우리를 지배하는 도구가 되게 둘 순 없다.”"],amber)}
    } else {
        let u=t-110;plate(c,art[6],u/10,false,u>=4 ? 0.5:0.15)
        if u<4 {caption(c,["1910년대부터 1980년대까지,", "문학의 기록이 남아 있는 데이터센터."])}
        else {
            text(c,"2030",640,445,110,white,true)
            text(c,"현대문학사 데이터 점령전",640,354,44,white,true)
            caption(c,["이제, 이 기록의 운명이", "당신들에게 맡겨진다."])
        }
    }
    // Short dips separate events without making every artwork dissolve into another slide.
    for boundary in [20.0,36,48,64,80,96,110] {
        let distance=abs(t-boundary)
        if distance<0.24 {fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:(1-distance/0.24)*0.62))}
    }
    texture(c,t)
    fill(c,0,0,1280,40,.black);fill(c,0,680,1280,40,.black)
    let fade=min(1,t/0.6)*min(1,max(0,(120-t)/1))
    if fade<1 {fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:1-fade))}
}
let qaSeconds=[2.0,11,27,43,60,72,93,100,106,117]
if CommandLine.arguments.contains("--stills") {
    for t in qaSeconds {
        let c=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        draw(c,t)
        let d=CGImageDestinationCreateWithURL(out.appendingPathComponent("preview-\(Int(t)).png") as CFURL,"public.png" as CFString,1,nil)!
        CGImageDestinationAddImage(d,c.makeImage()!,nil);CGImageDestinationFinalize(d)
    }
    print("Preview frames ready");exit(0)
}
let final=out.appendingPathComponent("common-prologue-v1-no-voice.mp4")
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
    if f%240==0 {print("Rendered \(f)/2880");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError(String(describing:writer.error))}
let result=AVURLAsset(url:final)
print("DONE \(final.path) duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count)")
