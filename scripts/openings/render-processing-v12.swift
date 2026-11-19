import AppKit
import AVFoundation
import ImageIO
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let source = root.appendingPathComponent("assets/openings/luddite-pixel-v12/record-processing-room.png")
let art = CGImageSourceCreateImageAtIndex(CGImageSourceCreateWithURL(source as CFURL,nil)!,0,nil)!
let W=1280,H=720,fps:Int32=24,duration=11.0
let out=root.appendingPathComponent("output/openings/luddite-pixel-v12")
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
func draw(_ c:CGContext,_ t:Double) {
    let width=Double(art.width),height=Double(art.height)
    c.scaleBy(x:1280/width,y:720/height)
    func box(_ x:Double,_ y:Double,_ w:Double,_ h:Double)->CGRect {
        CGRect(x:x,y:height-y-h,width:w,height:h)
    }
    c.interpolationQuality = .none
    c.draw(art,in:box(0,0,width,height))
    func patch(_ x:Int,_ y:Int,_ w:Int,_ h:Int,_ dx:Double,_ dy:Double) {
        let tile=art.cropping(to:CGRect(x:x,y:y,width:w,height:h))!
        c.draw(tile,in:box(dx,dy,Double(w),Double(h)))
    }
    // Clear the original sheet and repeat a clean section of the belt.
    let travel = max(0,min(1,(t-5.6)/4.1))
    let offset = Int(travel*910)%120
    c.saveGState()
    c.clip(to:box(235,627,980,48))
    for i in -1...9 {patch(640,627,120,48,235+Double(i*120+offset),627)}
    c.restoreGState()
    patch(540,609,200,18,316,609)
    c.saveGState()
    // The near wall of the intake occludes the sheet across its full depth.
    let intakeX = 1219.0
    c.clip(to:box(230,590,intakeX-230,92))
    c.translateBy(x:floor(travel*1030),y:0)
    let points=[(317,665),(368,614),(510,609),(473,661),(455,669)]
    c.beginPath()
    for (i,p) in points.enumerated() {
        let pt=CGPoint(x:Double(p.0),y:height-Double(p.1))
        if i==0 {c.move(to:pt)} else {c.addLine(to:pt)}
    }
    c.closePath();c.clip();c.draw(art,in:box(0,0,width,height));c.restoreGState()
    for row in 0..<8 {
        for x in [890,1053,1214] {
            let lit=t>3.1+Double(7-row)*0.24
            c.setFillColor((lit ? NSColor.systemGreen:NSColor.darkGray).cgColor)
            c.fill(box(Double(x-6),Double(104+row*42),12,12))
        }
    }
    if t>0.6 && t<4.5 {
        let path=[(349.0,608.0),(349,270),(602,270),(663,116),(748,116)]
        for i in 0..<8 {
            let phase=(t*1.2+Double(i)/2).truncatingRemainder(dividingBy:4)
            let k=Int(phase),f=phase-Double(k)
            let x=path[k].0*(1-f)+path[k+1].0*f,y=path[k].1*(1-f)+path[k+1].1*f
            let glyph=i%2==0 ? ["111","101","101","101","111"]:["010","110","010","010","111"]
            c.setFillColor(NSColor.cyan.cgColor)
            for (r,line) in glyph.enumerated(){for (j,b) in line.enumerated() where b=="1"{c.fill(box(x+Double(j*3),y+Double(r*3),3,3))}}
        }
    }
    let intakeTime = 5.6 + (intakeX-510)/1030*4.1
    if t > intakeTime {
        for (x,r) in [(1337,46),(1445,45)] {
            c.saveGState()
            let rect=box(Double(x-r),Double(645-r),Double(2*r),Double(2*r))
            c.addEllipse(in:rect);c.clip();c.translateBy(x:rect.midX,y:rect.midY)
            c.rotate(by:(t-intakeTime)*(x==1337 ? 3 : -3));c.translateBy(x:-rect.midX,y:-rect.midY)
            c.draw(art,in:box(0,0,width,height));c.restoreGState()
        }
        for i in 0..<16 {
            let drop=((t-intakeTime)*90+Double(i*13)).truncatingRemainder(dividingBy:45)
            c.setFillColor(NSColor.wheatPaper.cgColor);c.fill(box(Double(1320+i*9),689+drop,4,9))
        }
    }
}
extension NSColor {static let wheatPaper=NSColor(calibratedRed:0.97,green:0.82,blue:0.59,alpha:1)}
let final=out.appendingPathComponent("processing-v12.mp4")
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
