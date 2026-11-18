import Foundation
import AVFoundation
import AppKit
import CoreText
import ImageIO

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let version = CommandLine.arguments.contains("--v2") ? "v2" : "v1"
let isV2 = version == "v2"
let out = root.appendingPathComponent("output/openings/luddite-teaser-\(version)")
if isV2 {
    let fontDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts")
    for filename in ["Galmuri11.ttf", "Galmuri11-Bold.ttf"] {
        var error: Unmanaged<CFError>?
        CTFontManagerRegisterFontsForURL(fontDir.appendingPathComponent(filename) as CFURL,.process,&error)
    }
}
let assets = out.appendingPathComponent("assets")
let width = 1280, height = 720, fps: Int32 = 24
let duration = 20.0
let bgURL = assets.appendingPathComponent("archive-room.png")
let source = CGImageSourceCreateWithURL(bgURL as CFURL, nil)!
let bg = CGImageSourceCreateImageAtIndex(source, 0, nil)!
let cyan = NSColor(calibratedRed: 0.40, green: 0.91, blue: 0.88, alpha: 1)
let red = NSColor(calibratedRed: 1, green: 0.35, blue: 0.35, alpha: 1)
let white = NSColor(calibratedWhite: 0.94, alpha: 1)
func rect(_ c: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ color: NSColor) {
    c.setFillColor(color.cgColor); c.fill(CGRect(x:x,y:y,width:w,height:h))
}
func label(_ c: CGContext, _ text: String, _ y: CGFloat, _ size: CGFloat, _ color: NSColor = white, _ center: Bool = true, _ x: CGFloat = 76) {
    let fontSize: CGFloat = isV2 ? (size > 55 ? 66 : size > 40 ? 44 : size > 28 ? 33 : 22) : size
    let fontName = isV2 ? (size > 28 ? "Galmuri11-Bold" : "Galmuri11") : "AppleSDGothicNeo-SemiBold"
    let font = CTFontCreateWithName(fontName as CFString,fontSize,nil)
    c.setShouldAntialias(!isV2)
    c.setShouldSmoothFonts(!isV2)
    let a = NSAttributedString(string:text, attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font, .foregroundColor:color])
    let line = CTLineCreateWithAttributedString(a)
    let w = CTLineGetTypographicBounds(line,nil,nil,nil)
    c.textMatrix = .identity
    c.textPosition = CGPoint(x: round(center ? (CGFloat(width)-w)/2 : x),y:round(y))
    CTLineDraw(line,c)
}
func interference(_ c: CGContext, _ t: Double) {
    let f = Int(t*24)
    var seed = UInt64(f+2030)
    func random() -> Double {
        seed = seed &* 6364136223846793005 &+ 1442695040888963407
        return Double((seed >> 33) & 0x7fffffff)/Double(0x7fffffff)
    }
    let strength = t >= 11.5 && t < 17.6 ? 0.26 : 1.0
    c.setShouldAntialias(false)
    for _ in 0..<1500 {
        let x = floor(random()*640)*2
        let y = floor(random()*310)*2+50
        let a = (0.03+random()*0.15)*strength
        rect(c,x,y,random() > 0.97 ? 16 : 2,2,NSColor(calibratedWhite:random() > 0.5 ? 1 : 0,alpha:a))
    }
    if f%37 < 2 && strength > 0.5 {
        let y = 90+CGFloat((f*37)%500)
        rect(c,0,y,1280,8,cyan.withAlphaComponent(0.12))
        rect(c,CGFloat((f*13)%300),y-5,780,3,red.withAlphaComponent(0.22))
    }
    let sweep = 50+CGFloat((f*3)%620)
    rect(c,0,sweep,1280,2,cyan.withAlphaComponent(0.06*strength))
}
func draw(_ c: CGContext,_ t:Double) {
    rect(c,0,0,1280,720,.black)
    let zoom = 1.0 + t * 0.002
    let bw = 1280.0*zoom, bh = bw*Double(bg.height)/Double(bg.width)
    c.draw(bg,in:CGRect(x:(1280-bw)/2,y:(720-bh)/2,width:bw,height:bh))
    rect(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:t >= 11.5 ? 0.65 : 0.39))
    rect(c,0,0,1280,49,.black);rect(c,0,671,1280,49,.black)
    label(c,"2030  /  PRIVATE CHANNEL",640,17,cyan,false)
    label(c,"LUDDITE  ·  ENCRYPTED TRANSMISSION",69,14,cyan,false)
    if t < 1.3 {
        label(c,"외부 통신 연결",365,37)
        label(c,"ESTABLISHING SECURE LINK",325,16,cyan)
    } else if t < 6.2 {
        let p = min(1.0,max(0,(t-1.7)/3.4))
        rect(c,280,265,720,230,NSColor(calibratedWhite:0.025,alpha:0.88))
        label(c,"01  /  기록 반출",445,19,cyan)
        label(c,p < 1 ? "진짜 기록을 외부로 옮기는 중" : "외부 백업 완료",385,34)
        rect(c,340,325,600,4,NSColor(calibratedWhite:0.2,alpha:1))
        rect(c,340,325,600*p,4,cyan)
        label(c,String(format:"HUMAN ARCHIVE  →  OFFLINE BACKUP     %03d%%",Int(p*100)),285,15,cyan)
        label(c,"먼저 진짜 기록을 밖으로 옮겨.",140,29)
    } else if t < 11.5 {
        let p = min(1.0,(t-6.2)/3.7)
        rect(c,200,265,880,230,NSColor(calibratedWhite:0.025,alpha:0.9))
        label(c,"02  /  HUMAN 기록 오염",445,19,red)
        label(c,"외부 백업  /  원본 보존",380,30,cyan,false,255)
        label(c,"HUMAN  /  변조 중",323,30,red,false,255)
        for i in 0..<24 {
            let a = Double(i)/24 < p ? 0.9 : 0.16
            rect(c,650+CGFloat(i)*14,326,9,21,NSColor(calibratedRed:1,green:0.25,blue:0.26,alpha:a))
        }
        if Int(t*13)%5 == 0 { rect(c,180,300+CGFloat(Int(t*91)%170),920,3,red.withAlphaComponent(0.5)) }
        label(c,"백업 완료. 이제 HUMAN의 기록을 오염시켜.",140,29)
    } else if t < 17.6 {
        label(c,"우리가 남길 것은,",404,43)
        if t >= 12.6 { label(c,"누구의 허락도 필요 없는",337,43) }
        if t >= 14.0 { label(c,"인간의 기록이야.",270,43,cyan) }
    } else {
        label(c,"L U D D I T E",365,61)
        label(c,"외부 통신 종료",307,25,cyan)
    }
    if isV2 {
        interference(c,t)
        c.setShouldAntialias(false)
        for y in stride(from:50,to:670,by:3) { rect(c,0,CGFloat(y),1280,1,NSColor(calibratedWhite:0,alpha:0.19)) }
        for (x,y,dx,dy) in [(CGFloat(56),CGFloat(102),CGFloat(1),CGFloat(1)),(1224,102,-1,1),(56,618,1,-1),(1224,618,-1,-1)] {
            rect(c,min(x,x+dx*20),y,20,2,cyan.withAlphaComponent(0.65))
            rect(c,x,min(y,y+dy*20),2,20,cyan.withAlphaComponent(0.65))
        }
    } else {
        for y in stride(from:50,to:670,by:4) { rect(c,0,CGFloat(y),1280,1,NSColor(calibratedWhite:0,alpha:0.10)) }
    }
    let fade = min(1,t/0.6) * min(1,max(0,(20-t)/0.65))
    if fade < 1 { rect(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:1-fade)) }
}
let silent = out.appendingPathComponent("picture.mp4")
try? FileManager.default.removeItem(at:silent)
let writer = try AVAssetWriter(outputURL:silent,fileType:.mp4)
let input = AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:width,AVVideoHeightKey:height,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:5_000_000,AVVideoMaxKeyFrameIntervalKey:48]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:width,kCVPixelBufferHeightKey as String:height,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input);writer.startWriting();writer.startSession(atSourceTime:.zero)
for frame in 0..<Int(duration*Double(fps)) {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval:0.002) }
    autoreleasepool {
        var buffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil,adaptor.pixelBufferPool!,&buffer)
        let b = buffer!
        CVPixelBufferLockBaseAddress(b,[])
        let context = CGContext(data:CVPixelBufferGetBaseAddress(b),width:width,height:height,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        draw(context,Double(frame)/Double(fps))
        if [72,204,348,444].contains(frame), let image = context.makeImage() {
            let url = out.appendingPathComponent("frame-\(frame).png")
            let d = CGImageDestinationCreateWithURL(url as CFURL,"public.png" as CFString,1,nil)!
            CGImageDestinationAddImage(d,image,nil);CGImageDestinationFinalize(d)
        }
        CVPixelBufferUnlockBaseAddress(b,[])
        if !adaptor.append(b,withPresentationTime:CMTime(value:Int64(frame),timescale:fps)) { fatalError("frame append: \(String(describing:writer.error))") }
    }
}
input.markAsFinished()
let done = DispatchSemaphore(value:0)
writer.finishWriting {done.signal()};done.wait()
guard writer.status == .completed else {fatalError("video writer: \(String(describing:writer.error))")}
var composition = AVMutableComposition()
let va = AVURLAsset(url:silent)
let vt = composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
try vt.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:duration,preferredTimescale:600)),of:va.tracks(withMediaType:.video)[0],at:.zero)
for (name,start) in [("sound.wav",0.0),("voice-1.aiff",1.7),("voice-2.aiff",6.5),("voice-3.aiff",12.0)] {
    let a = AVURLAsset(url:assets.appendingPathComponent(name))
    guard let src = a.tracks(withMediaType:.audio).first else {fatalError("missing audio: \(name)")}
    let track = composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
    let length = min(CMTimeGetSeconds(a.duration),duration-start)
    guard length > 0.1 else {fatalError("empty audio: \(name)")}
    try track.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:length,preferredTimescale:44100)),of:src,at:CMTime(seconds:start,preferredTimescale:600))
}
// Mix all narration and effects into one stereo-compatible audio stream.
let mixedURL = assets.appendingPathComponent("mixed-audio.m4a")
try? FileManager.default.removeItem(at:mixedURL)
let mix = AVMutableAudioMix()
mix.inputParameters = composition.tracks(withMediaType:.audio).map { track in
    let p = AVMutableAudioMixInputParameters(track:track)
    p.setVolume(1.0,at:.zero)
    return p
}
let ae = AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetAppleM4A)!
ae.outputURL=mixedURL;ae.outputFileType = .m4a;ae.audioMix=mix
let audioDone=DispatchSemaphore(value:0)
ae.exportAsynchronously {audioDone.signal()};audioDone.wait()
guard ae.status == .completed else {fatalError("audio mix: \(String(describing:ae.error))")}
let mux = AVMutableComposition()
let muxVideo = mux.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
try muxVideo.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:duration,preferredTimescale:600)),of:va.tracks(withMediaType:.video)[0],at:.zero)
let mixed = AVURLAsset(url:mixedURL)
let muxAudio=mux.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
try muxAudio.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:duration,preferredTimescale:600)),of:mixed.tracks(withMediaType:.audio)[0],at:.zero)
composition=mux
let final = out.appendingPathComponent("luddite-teaser-\(version).mp4")
try? FileManager.default.removeItem(at:final)
let export = AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetHighestQuality)!
export.outputURL=final;export.outputFileType = .mp4;export.shouldOptimizeForNetworkUse=true
let exported=DispatchSemaphore(value:0)
export.exportAsynchronously {exported.signal()};exported.wait()
guard export.status == .completed else {fatalError("export: \(String(describing:export.error))")}
let result=AVURLAsset(url:final)
print("DONE \(final.path) duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count)")
