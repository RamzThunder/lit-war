import Foundation
import AVFoundation
import AppKit
import CoreText
import ImageIO

let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/luddite-v3")
let assets=out.appendingPathComponent("assets")
let W=1280,H=720,fps:Int32=24,duration=75.0
for file in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    let u=FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(file)")
    CTFontManagerRegisterFontsForURL(u as CFURL,.process,nil)
}
func loadImage(_ name:String)->CGImage {
    let s=CGImageSourceCreateWithURL(assets.appendingPathComponent(name) as CFURL,nil)!
    return CGImageSourceCreateImageAtIndex(s,0,nil)!
}
let room=loadImage("archive-room.png"),memory=loadImage("human-memory.png")
let cyan=NSColor(calibratedRed:0.38,green:0.91,blue:0.86,alpha:1)
let red=NSColor(calibratedRed:1,green:0.35,blue:0.35,alpha:1)
let amber=NSColor(calibratedRed:1,green:0.76,blue:0.43,alpha:1)
let white=NSColor(calibratedWhite:0.95,alpha:1)
func fill(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {
    c.setFillColor(col.cgColor);c.fill(CGRect(x:x,y:y,width:w,height:h))
}
func text(_ c:CGContext,_ s:String,_ x:Double,_ y:Double,_ size:Double=33,_ col:NSColor=white,_ center:Bool=false) {
    let font=CTFontCreateWithName((size>=33 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let a=NSAttributedString(string:s,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:col])
    let line=CTLineCreateWithAttributedString(a)
    let width=CTLineGetTypographicBounds(line,nil,nil,nil)
    precondition(width <= 1180,"Text overflow: \(s) (\(width))")
    c.setShouldAntialias(false);c.setShouldSmoothFonts(false);c.textMatrix = .identity
    c.textPosition=CGPoint(x:round(center ? x-width/2:x),y:round(y));CTLineDraw(line,c)
}
func frame(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {
    fill(c,x,y,w,h,NSColor(calibratedWhite:0.015,alpha:0.93))
    fill(c,x,y,w,2,col);fill(c,x,y+h-2,w,2,col);fill(c,x,y,2,h,col);fill(c,x+w-2,y,2,h,col)
}
func message(_ c:CGContext,_ lines:[String],_ speaker:String="외부 접선자",_ col:NSColor=cyan) {
    frame(c,60,64,1160,150,col.withAlphaComponent(0.6))
    text(c,speaker,85,180,22,col)
    for (i,line) in lines.enumerated(){text(c,line,85,132-Double(i)*43,33)}
}
func background(_ c:CGContext,_ image:CGImage,_ t:Double,_ shade:Double=0.45) {
    let z=1.0+0.018*sin(t*0.035)
    let w=1280*z,h=w*Double(image.height)/Double(image.width)
    c.setShouldAntialias(true);c.interpolationQuality = .high
    c.draw(image,in:CGRect(x:(1280-w)/2,y:(720-h)/2,width:w,height:h))
    fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:shade))
}
func record(_ c:CGContext,_ x:Double,_ y:Double,_ title:String="동백꽃",_ status:String="원본",_ col:NSColor=cyan,_ corrupted:Bool=false) {
    frame(c,x,y,390,196,col)
    text(c,status,x+20,y+155,22,col)
    text(c,title,x+20,y+101,33)
    text(c,"김유정  /  1936",x+20,y+58,22)
    for i in 0..<3 {fill(c,x+20,y+22+Double(i)*7,Double(205-i*30),2,col.withAlphaComponent(0.35))}
    if corrupted {
        fill(c,x+16,y+90,355,31,NSColor(calibratedWhite:0.01,alpha:1))
        text(c,"[기록 데이터 변조됨]",x+20,y+96,22,red)
    }
}
func link(_ c:CGContext,_ p:Double,_ col:NSColor=cyan,_ reverse:Bool=false) {
    fill(c,484,400,310,2,col.withAlphaComponent(0.4))
    for i in 0..<8 {
        let q=(p*1.6+Double(i)/8).truncatingRemainder(dividingBy:1)
        let x=484+310*(reverse ? 1-q:q)
        fill(c,x,393,8,16,col.withAlphaComponent(0.2+q*0.7))
    }
}
func staticNoise(_ c:CGContext,_ t:Double,_ strength:Double) {
    var seed=UInt64(Int(t*24)+2030)
    func r()->Double{seed=seed &* 6364136223846793005 &+ 1;return Double(seed>>33)/Double(UInt64.max>>33)}
    for _ in 0..<800 {
        let x=floor(r()*640)*2,y=floor(r()*310)*2+50
        fill(c,x,y,r()>0.98 ? 18:2,2,NSColor(calibratedWhite:r()>0.5 ? 1:0,alpha:r()*0.16*strength))
    }
    for y in stride(from:50,to:670,by:3){fill(c,0,Double(y),1280,1,NSColor(calibratedWhite:0,alpha:0.08))}
    let f=Int(t*24)
    if strength>0.7 && f%47<2 {fill(c,0,Double(230+(f*7)%350),1280,5,cyan.withAlphaComponent(0.14))}
}
let sceneTimes:[(Double,String)]=[(0,"01-normal"),(4,"02-contact"),(10,"03-memory"),(21,"04-backup"),(33,"05-contaminate"),(45,"06-guardian"),(57,"07-read"),(65,"08-main-line"),(73,"09-end")]
func draw(_ c:CGContext,_ t:Double) {
    fill(c,0,0,1280,720,.black)
    if t<4 {
        fill(c,0,0,1280,720,NSColor(calibratedRed:0.015,green:0.04,blue:0.055,alpha:1))
        text(c,"HUMAN ARCHIVE",640,470,44,white,true)
        text(c,"記録端末 / 기록 단말기",640,420,22,cyan,true)
        text(c,"접속 확인 중",640,323,33,white,true)
        fill(c,390,285,500,4,white.withAlphaComponent(0.2));fill(c,390,285,500*min(1,t/3.2),4,cyan)
        text(c,"1910 — 1980  /  문학 기록실",640,225,22,cyan,true)
    } else if t<10 {
        background(c,room,t,0.70)
        frame(c,225,300,830,240,cyan)
        text(c,"외부 통신이 끼어들었습니다",640,472,33,cyan,true)
        text(c,"발신자 확인 불가",640,410,22,red,true)
        text(c,"연결 유지",640,350,22,cyan,true)
        message(c,t<7 ? ["연결됐네.","길게 말할 시간은 없어."]:["이 채널은 HUMAN의 안내 방송이 아니야.","네게 맡길 일이 있어."])
    } else if t<21 {
        background(c,memory,t,0.25)
        fill(c,0,220,850,450,NSColor(calibratedWhite:0,alpha:0.37))
        text(c,"사람이 남긴 흔적",86,550,44,amber)
        text(c,"1910년대부터 1980년대까지",88,489,22,white)
        text(c,"우리가 읽고 되찾을 문학 기록",88,450,22,white)
        if t<15.2 {message(c,["저 안에 있는 건", "기계가 만든 기억이 아니야."],"외부 접선자",amber)}
        else {message(c,["사람이 살고, 쓰고, 남긴 거지."],"외부 접선자",amber)}
    } else if t<33 {
        background(c,room,t,0.64)
        text(c,"01  /  진짜 기록을 밖으로",640,575,33,cyan,true)
        text(c,"HUMAN 아카이브",270,511,22,white,true)
        text(c,"인간의 외부 저장소",1010,511,22,cyan,true)
        record(c,75,283)
        let p=min(1,max(0,(t-22)/6.0))
        if p<1 {
            link(c,p)
            c.saveGState();c.setAlpha(p)
            record(c,75+740*p,283,"동백꽃","전송 중",cyan)
            c.restoreGState()
        } else {record(c,815,283,"동백꽃","백업 완료 / 원본 보존",cyan)}
        if t<27.5 {message(c,["먼저 진짜 기록을 밖으로 옮겨.","한 글자도 잃지 않게."])}
        else {message(c,["외부 백업을 확보했어.","진짜 기록은 우리에게 남아 있어."])}
    } else if t<45 {
        background(c,room,t,0.67)
        text(c,"02  /  HUMAN의 사본만 오염",640,575,33,red,true)
        text(c,"HUMAN 아카이브",270,511,22,red,true)
        text(c,"인간의 외부 저장소",1010,511,22,cyan,true)
        record(c,75,283,"동백꽃","오염 / 변조됨",red,true)
        record(c,815,283,"동백꽃","백업 안전 / 원본 보존",cyan)
        let f=Int(t*24)
        for i in 0..<7 {fill(c,90+Double((f*13+i*43)%280),309+Double(i)*21,70,3,red.withAlphaComponent(0.65))}
        if t<38.2 {message(c,["백업을 확보한 뒤,", "HUMAN이 가진 기록을 오염시켜."],"외부 접선자",red)}
        else {message(c,["우리가 지키는 건 기록이고,", "무너뜨릴 건 독점이야."])}
    } else if t<57 {
        background(c,room,t,0.68)
        text(c,"보존관이 복구를 시작했습니다",640,575,33,white,true)
        let p=min(1,max(0,(t-46)/5))
        text(c,"GUARDIAN / 정화",270,511,22,cyan,true)
        text(c,"LUDDITE / 백업 보유",1010,511,22,red,true)
        record(c,75,283,"동백꽃",p<1 ? "정화 중":"정화 완료 / 원본 복구",cyan,p<1)
        record(c,815,283,"동백꽃","외부 원본 보존",red)
        fill(c,95,265,350,4,white.withAlphaComponent(0.2));fill(c,95,265,350*p,4,cyan)
        if t<50.8 {message(c,["보존관은 복구할 거야.","그들에게도 지켜야 할 이유가 있으니까."])}
        else {message(c,["하지만 우린 이 기록을", "HUMAN에게만 맡겨 둘 수 없어."])}
    } else if t<65 {
        background(c,memory,t,0.62)
        text(c,"다음 기록에 접속할 준비",640,555,33,amber,true)
        record(c,445,290,"동백꽃","읽기 / 원본 확인",amber)
        if t<60.5 {message(c,["기록을 읽어."],"외부 접선자",amber)}
        else {message(c,["진짜를 알아야,", "무엇을 바꿀지도 알 수 있어."],"외부 접선자",amber)}
    } else if t<73 {
        background(c,room,t,0.78)
        text(c,"우리가 남길 것은,",640,420,44,white,true)
        if t>=66.5 {text(c,"누구의 허락도 필요 없는",640,347,44,white,true)}
        if t>=68.3 {text(c,"인간의 기록이야.",640,274,44,cyan,true)}
    } else {
        fill(c,0,0,1280,720,NSColor(calibratedRed:0.01,green:0.025,blue:0.03,alpha:1))
        text(c,"L U D D I T E",640,370,66,white,true)
        text(c,"통신 종료",640,303,22,cyan,true)
    }
    if t>=4 && t<73 {staticNoise(c,t,t>=65 ? 0.2:t<10 ? 1:0.55)}
    fill(c,0,0,1280,45,.black);fill(c,0,675,1280,45,.black)
    if t>=4 && t<65 {text(c,"2030  /  외부 통신",64,645,22,cyan)}
    let fade=min(1,t/0.6)*min(1,max(0,(75-t)/0.6))
    if fade<1{fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:1-fade))}
}
let final=out.appendingPathComponent("luddite-v3-no-voice.mp4")
try? FileManager.default.removeItem(at:final)
let writer=try AVAssetWriter(outputURL:final,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:4_000_000,AVVideoMaxKeyFrameIntervalKey:48]])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input)
guard writer.startWriting() else {fatalError("writer start: \(String(describing:writer.error))")}
writer.startSession(atSourceTime:.zero)
let snapshots:[Int]=[48,144,384,720,960,1272,1488,1704,1764]
for f in 0..<Int(duration*Double(fps)) {
    while !input.isReadyForMoreMediaData {
        if writer.status == .failed {fatalError("writer failed: \(String(describing:writer.error))")}
        Thread.sleep(forTimeInterval:0.002)
    }
    autoreleasepool {
        var b:CVPixelBuffer?
        guard let pool=adaptor.pixelBufferPool else {fatalError("No buffer pool")}
        CVPixelBufferPoolCreatePixelBuffer(nil,pool,&b)
        let buffer=b!
        CVPixelBufferLockBaseAddress(buffer,[])
        let c=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        draw(c,Double(f)/Double(fps))
        if snapshots.contains(f),let im=c.makeImage() {
            let u=out.appendingPathComponent("frame-\(f).png")
            let d=CGImageDestinationCreateWithURL(u as CFURL,"public.png" as CFString,1,nil)!
            CGImageDestinationAddImage(d,im,nil);CGImageDestinationFinalize(d)
        }
        CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else {fatalError("append failed")}
    }
    if f%240==0 {print("Rendered \(f)/1800");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0)
writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError("render: \(String(describing:writer.error))")}
let result=AVURLAsset(url:final)
print("DONE duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count) \(final.path)")
