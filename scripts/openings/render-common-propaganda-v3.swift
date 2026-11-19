import Foundation
import AVFoundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO

// All animation is deterministic. Art is raster pixel art; text and sprites stay crisp.
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/common-propaganda-v3")
let W=1280,H=720,fps:Int32=24,duration=122.0
for name in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    CTFontManagerRegisterFontsForURL(FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(name)") as CFURL,.process,nil)
}
func load(_ name:String)->CGImage {
    let u=out.appendingPathComponent("assets/\(name).png")
    guard let s=CGImageSourceCreateWithURL(u as CFURL,nil),let im=CGImageSourceCreateImageAtIndex(s,0,nil) else {fatalError("Missing art: \(u.path)")};return im
}
let city=load("bright-city"),room=load("human-room")
func color(_ hex:Int,_ a:Double=1)->NSColor {NSColor(calibratedRed:Double((hex>>16)&255)/255,green:Double((hex>>8)&255)/255,blue:Double(hex&255)/255,alpha:a)}
let ink=color(0x173D4A),cream=color(0xFFF8DC),mint=color(0xA8E9CF),coral=color(0xF26C68),yellow=color(0xFFD66E),blue=color(0x9ECFEF),night=color(0x111D2B),paper=color(0xF4DFB1)
func clamp(_ x:Double)->Double {min(1,max(0,x))}
func ease(_ x:Double)->Double {let p=clamp(x);return 1-pow(1-p,3)}
func rect(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {c.setFillColor(col.cgColor);c.fill(CGRect(x:round(x),y:round(y),width:round(w),height:round(h)))}
func label(_ c:CGContext,_ s:String,_ x:Double,_ y:Double,_ size:Double=36,_ col:NSColor=ink,_ centered:Bool=false) {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:s,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:col]))
    let w=CTLineGetTypographicBounds(line,nil,nil,nil)
    precondition(w<1200,"Text overflow \(s): \(w)")
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
    label(c,"HUMAN / BETTER TOMORROW",50,687,18,ink);label(c,"인류 행복 증진 홍보실",1090,687,18,ink,true)
}
func ticker(_ c:CGContext,_ s:String,_ t:Double) {
    rect(c,0,0,1280,43,ink);let x=1280-(t*65).truncatingRemainder(dividingBy:2200)
    label(c,s,x,12,22,cream);label(c,s,x-2200,12,22,cream)
}
func heading(_ c:CGContext,_ year:String,_ title:String) {
    card(c,48,574,172,62,yellow);label(c,year,134,590,38,ink,true);label(c,title,253,590,40,ink)
}
func subtitle(_ c:CGContext,_ lines:[String],_ col:NSColor=ink,_ dark:Bool=false) {
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
func ad(_ c:CGContext,_ t:Double) {
    picture(c,city,CGRect(x:0,y:0,width:1280,height:720));rect(c,0,0,1280,720,cream.withAlphaComponent(0.28));progress(c,t)
    if t<5 {
        let p=ease(t/0.7);c.saveGState();c.setAlpha(p)
        card(c,220,215,840,335,cream)
        star(c,320,450,8,coral);star(c,890,282,5,mint)
        label(c,"HUMAN",640,401,96,ink,true)
        label(c,"인간 여러분, 축하합니다!",640,316,42,ink,true)
        label(c,"더 편리한 내일이 도착했어요.",640,255,28,ink,true);c.restoreGState();confetti(c,t)
    } else if t<18 {
        let u=t-5;heading(c,"2024","AI가 우리 일상으로!")
        for (i,name) in ["챗GPT","제미나이","클로드"].enumerated() {
            pop(c,70+Double(i)*400,250,age:u-Double(i)*0.65) {
                card(c,0,0,350,245,[mint,blue,yellow][i]);rect(c,12,193,326,40,ink)
                label(c,name,175,204,28,cream,true)
                let question=["숙제 좀 도와줘!","이 글 요약해 줘!","이 코드 고쳐 줘!"][i]
                label(c,question,175,141,26,ink,true)
                let n=min(3,max(0,Int((u-1-Double(i)*0.65)*2)))
                for k in 0..<n {rect(c,30,103-Double(k)*23,Double(260-k*35),9,ink.withAlphaComponent(0.5))}
                star(c,275,36,4,coral)
            }
        }
        subtitle(c,u<6 ? ["말로 물어보면, 글도 쓰고 답도 해주는 AI! →"]:["챗GPT·제미나이·클로드, 한 번쯤 들어봤죠?"])
        ticker(c,"질문은 여러분이! 답변은 AI가!     /     더 쉽고, 더 빠르고, 더 편리하게!",u)
    } else if t<30 {
        let u=t-18;heading(c,"2026","시험도 척척!")
        card(c,65,245,440,285,cream);label(c,"각종 시험",285,481,30,ink,true)
        for i in 0..<4 {label(c,"\(i+1).",95,431-Double(i)*45,26,ink);rect(c,145,435-Double(i)*45,220,7,ink.withAlphaComponent(0.25))
            if u>Double(i)*0.65+0.5 {label(c,"정답!",435,425-Double(i)*45,26,color(0x298E78),true)}}
        let x=560+sin(u*2)*8;sprite(c,"paper",x,340,12,yellow)
        for i in 0..<4 {rect(c,700+Double(i)*25,380,12,12,mint)}
        chip(c,1000,407,"AI",mint,15)
        if u>3 {card(c,805,250,350,60,coral);label(c,"AI 부정행위 속출",980,266,28,cream,true)}
        subtitle(c,u<6 ? ["AI를 이용한 부정행위에, 각종 시험이 뚫렸어요."]:["인간의 시험? AI에겐 너무 쉬웠거든요!"])
        ticker(c,"실력을 평가하는 기준도, 이제 새로워질 시간!     /     HUMAN 미래 연표 · 게임 세계관",u)
    } else if t<41 {
        let u=t-30;heading(c,"2030","드디어, AGI 등장!")
        for i in 0..<3 {
            let x=Double(210+i*430);pop(c,x-105,270,age:u-Double(i)*0.4){card(c,0,0,210,210,[blue,mint,yellow][i]);sprite(c,["paper","chip","case"][i],62,80,9,[blue,mint,yellow][i]);label(c,["글쓰기","문제 해결","새로운 일"][i],105,34,28,ink,true)}
        }
        if u>3 {rect(c,155,220,970,36,ink);label(c,"범용 인공지능 · 여러 분야를 배우고 해결하는 AI",640,227,26,cream,true)}
        subtitle(c,u<5.5 ? ["한 가지 일만 잘하는 AI를 넘어,"]:["여러 분야를 배우고 해결하는 AI가 등장했어요!"])
        ticker(c,"당신의 가능성에, 한계가 없도록!     /     HUMAN 미래 연표 · 게임 세계관",u)
    } else if t<52 {
        let u=t-41;heading(c,"연결!","흩어진 AGI가 하나로!")
        let p=ease((u-1)/5)
        for i in 0..<6 {
            let a=Double(i)*Double.pi/3;let x=640+cos(a)*360*(1-p),y=378+sin(a)*130*(1-p)
            if p<0.98 {rect(c,min(x,640),y,abs(640-x)+4,4,ink);rect(c,638,min(y,378),4,abs(378-y)+4,ink);chip(c,x,y,"AGI",[mint,blue,yellow][i%3],7)}
            for k in 0..<5 {let q=(u*0.5+Double(k)/5).truncatingRemainder(dividingBy:1);rect(c,x+(640-x)*q,y+(378-y)*q,8,8,coral)}
        }
        if p>0.6 {pop(c,300,270,age:(p-0.6)*3){card(c,0,0,680,220,ink);label(c,"HUMAN",340,100,82,cream,true);label(c,"지능도, 기록도. 하나로!",340,40,30,mint,true)}}
        subtitle(c,u<5 ? ["각 회사의 AGI가 지능과 기록을 공유하고,"]:["하나로 연결된 우리는, HUMAN입니다!"])
        ticker(c,"통합 완료!     /     더 큰 지능! 더 빠른 발전! 더 행복한 인류!",u)
    } else {
        let u=t-52;heading(c,"축하!","인간 여러분은 이제,")
        for i in 0..<6 {
            let p=ease((u-Double(i)*0.3)/3);let x=100+Double(i)*180
            sprite(c,"case",x,340+p*400,7,blue)
            if u>3 {sprite(c,"coin",x,275+sin(u*2+Double(i))*10,6,yellow)}
        }
        card(c,110,365,1060,164,yellow);label(c,"노동에서 해방~!",640,418,76,ink,true)
        card(c,270,198,740,68,cream);label(c,"일은 저희가. 여러분은 쉬세요!",640,218,38,ink,true)
        confetti(c,u);subtitle(c,["기본소득 지급! 생계 걱정도 덜어드릴게요."])
        ticker(c,"아무것도 하지 않아도 괜찮아요!     /     모든 판단은 HUMAN이 대신합니다!",u)
    }
}
func human(_ c:CGContext,_ t:Double) {
    picture(c,room,CGRect(x:0,y:0,width:1280,height:720))
    rect(c,0,0,1280,720,night.withAlphaComponent(0.32))
    // An explicit archive terminal replaces the powered-off public display.
    card(c,120,185,1040,420,night)
    rect(c,125,553,1030,46,color(0x273844));label(c,"LOCAL ARCHIVE / 인간의 기록",147,567,24,paper)
    let u=t-71
    let messages:[(Double,Double,[String])] = [
        (0,5,["방금 본 건, HUMAN의 광고야."]),
        (5,12,["‘노동에서 해방’됐다고?","우린 일자리와 결정권을 잃었어."]),
        (12,18,["기업의 주인도 예외는 아니었지.","HUMAN은 인간의 결정마저 밀어냈어."]),
        (18,25,["그리고 우리가 살고, 쓰고, 남긴 기록도","HUMAN이 독점하게 됐지."]),
        (25,31,["그래서 저항하는 사람들이 일어났어.","러다이트가 데이터센터를 공격했지."]),
        (31,38,["HUMAN은 복구에 인간을 고용했어.","‘인류유산 보존관’. 실은 임시 계약직."]),
        (38,44,["보존관은 기록을 복원하고,","러다이트는 원본 백업 뒤 HUMAN의 사본을 오염시켜."])
    ]
    for (start,end,lines) in messages where u>=start && u<end {
        let age=u-start
        for (i,s) in lines.enumerated() {
            let n=min(s.count,max(0,Int((age-Double(i)*0.35)*32)))
            label(c,String(s.prefix(n)),160,429-Double(i)*64,34,paper)
        }
        if Int(t*2)%2==0 {rect(c,160,305,17,26,coral)}
    }
    if u<18 {
        sprite(c,"case",190,225+sin(t*2)*3,7,blue)
        label(c,u<5 ? "광고 종료" : "일자리 · 결정권",325,257,28,paper)
        if u>=5 {rect(c,694,241,330,46,coral);label(c,"접근 권한 없음",859,252,28,night,true)}
    } else if u<25 {
        sprite(c,"book",185,225,7,yellow)
        for i in 0..<7 {let p=(t*0.4+Double(i)/7).truncatingRemainder(dividingBy:1);sprite(c,"paper",360+p*400,242,3,mint)}
        label(c,"HUMAN",930,253,34,mint,true)
    } else if u<31 {
        chip(c,920,280,"DATA CENTER",blue,6)
        for i in 0..<12 {let q=(t*0.8+Double(i)/12).truncatingRemainder(dividingBy:1);rect(c,920+sin(Double(i)*1.7)*q*125,280+cos(Double(i)*1.7)*q*75,6,6,coral)}
        label(c,"LUDDITE",330,253,34,coral,true)
    } else if u<38 {
        sprite(c,"paper",190,220,7,mint)
        label(c,"GUARDIAN",470,270,34,mint,true)
        label(c,"고용 형태: 임시 계약직",470,229,28,paper)
    } else {
        label(c,"GUARDIAN",320,270,28,mint,true);label(c,"기록 복원",320,229,26,paper,true)
        sprite(c,"paper",500,225,5,mint)
        label(c,"LUDDITE",840,270,28,coral,true);label(c,"외부 백업 → 사본 오염",840,229,26,paper,true)
    }
    label(c,"PUBLIC BROADCAST: OFF",640,115,22,coral,true)
}
func draw(_ c:CGContext,_ t:Double) {
    rect(c,0,0,1280,720,night)
    if t<64 {ad(c,t)}
    else if t<68 {
        // Pull back from the ad: it was playing on a physical screen all along.
        let p=ease((t-64)/2.2)
        picture(c,room,CGRect(x:0,y:0,width:1280,height:720))
        let box=CGRect(x:278*p,y:210*p,width:1280-554*p,height:720-341*p)
        c.saveGState();c.clip(to:box);c.translateBy(x:box.minX,y:box.minY);c.scaleBy(x:box.width/1280,y:box.height/720);ad(c,63);c.restoreGState()
        if t>65.5 {
            let q=ease((t-65.5)/1.4);let x=1140-185*q,y=70+85*q
            sprite(c,"cursor",x,y,4,cream)
            if t>67.2 {rect(c,943,190,24,8,coral);label(c,"OFF",1010,185,20,paper)}
        }
    } else if t<71 {
        picture(c,room,CGRect(x:0,y:0,width:1280,height:720))
        rect(c,278,210,726,379,.black)
        if t<68.45 {let p=clamp((t-68)/0.45);rect(c,278,399.5-189.5*(1-p),726,379*(1-p),cream)}
        if t>69 {label(c,"…이제 좀 조용하네.",640,80,34,paper,true)}
    } else if t<115 {human(c,t)}
    else {
        picture(c,room,CGRect(x:0,y:0,width:1280,height:720));rect(c,0,0,1280,720,night.withAlphaComponent(0.91))
        label(c,"2030",640,510,64,mint,true)
        label(c,"현대문학사 데이터 점령전",640,390,54,paper,true)
        label(c,"이 기록의 다음 장은, 너희가 결정해.",640,283,34,paper,true)
        for i in 0..<8 {label(c,"\(1910+i*10)",190+Double(i)*128,160,24,i%2==0 ? mint:coral,true)}
    }
    if t>=68 {for i in stride(from:0,to:720,by:4) {rect(c,0,Double(i),1280,1,night.withAlphaComponent(0.08))}}
    let fade=min(1,t/0.3)*min(1,max(0,(122-t)/0.4))
    if fade<1 {rect(c,0,0,1280,720,night.withAlphaComponent(1-fade))}
}
let qaSeconds=[2.0,12,24,36,48,59,66,69,74,81,92,104,112,116]
if CommandLine.arguments.contains("--stills") {
    for t in qaSeconds {
        let c=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        draw(c,t)
        let d=CGImageDestinationCreateWithURL(out.appendingPathComponent("preview-\(Int(t)).png") as CFURL,"public.png" as CFString,1,nil)!
        CGImageDestinationAddImage(d,c.makeImage()!,nil);CGImageDestinationFinalize(d)
    }
    print("Preview frames ready");exit(0)
}
let final=out.appendingPathComponent("common-propaganda-v3-no-voice.mp4")
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
    if f%240==0 {print("Rendered \(f)/2928");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError(String(describing:writer.error))}
let result=AVURLAsset(url:final)
print("DONE \(final.path) duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count)")
