import AppKit
import CoreText
for name in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    let url = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/" + name)
    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
}
let args = CommandLine.arguments
let bitmap = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1280,pixelsHigh:720,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:bitmap)
NSGraphicsContext.current!.cgContext.setShouldAntialias(false)
NSGraphicsContext.current!.imageInterpolation = .none
let frame = NSRect(x:0,y:0,width:1280,height:720)
NSColor.black.setFill(); frame.fill()
if args[2] != "-" {
    NSImage(contentsOfFile:args[2])!.draw(in:frame,from:.zero,operation:.sourceOver,fraction:0.72)
    NSGradient(colors:[.black.withAlphaComponent(0.95),.black.withAlphaComponent(0.12)])!.draw(in:frame,angle:90)
}
func line(_ value:String,_ y:Int,_ size:CGFloat,_ color:NSColor) {
    guard let font = NSFont(name: size >= 40 ? "Galmuri11-Bold" : "Galmuri11", size:size) else { fatalError("Install Galmuri11 and Galmuri11-Bold before rendering") }
    let s = NSAttributedString(string:value,attributes:[.font:font,.foregroundColor:color])
    precondition(s.size().width < 1170)
    s.draw(at:NSPoint(x:80,y:y))
}
// Archive-terminal identity strip, composited from the opening masters.
let scene = Int(args[6])!
if scene < 5 {
    let faction = args[5]
    let marks = faction == "draw" ? ["human-mark","luddite-mark"] :
        [faction == "guardian" ? "human-mark" : "luddite-mark"]
    let panel = NSRect(x:64,y:608,width:marks.count == 2 ? 390 : 330,height:68)
    NSColor(calibratedRed:0.035,green:0.085,blue:0.13,alpha:0.94).setFill()
    panel.fill()
    for (i,mark) in marks.enumerated() {
        let path = URL(fileURLWithPath:args[7]).appendingPathComponent(mark + ".png")
        let icon = NSImage(contentsOf:path)!
        let ratio = min(50/icon.size.width,50/icon.size.height)
        let w = icon.size.width*ratio, h = icon.size.height*ratio
        icon.draw(in:NSRect(x:78+CGFloat(i)*58+(50-w)/2,y:617+(50-h)/2,width:w,height:h),from:.zero,operation:.sourceOver,fraction:1)
    }
    let channel = faction == "draw" ? "격리 기록실" : faction == "guardian" ? "보존관" : "러다이트"
    let tag = NSAttributedString(string:"2030 / "+channel,attributes:[.font:NSFont(name:"Galmuri11",size:24)!, .foregroundColor:NSColor.white])
    tag.draw(at:NSPoint(x:85+58*marks.count,y:627))
}
let rows = args[4].components(separatedBy:"|")
line(args[3], 124 + rows.count*60, 28, NSColor(calibratedRed:0.84,green:0.78,blue:0.58,alpha:1))
for (i,row) in rows.enumerated() { line(row,116+(rows.count-1-i)*60,40,.white) }

// Animated insets occupy the upper right, above the fixed subtitles.
func box(_ x:Int,_ y:Int,_ w:Int,_ h:Int,_ color:NSColor) {
    color.setFill()
    NSRect(x:x,y:y,width:w,height:h).fill()
}
let dark = NSColor(calibratedRed:0.035,green:0.09,blue:0.13,alpha:1)
let mint = NSColor(calibratedRed:0.51,green:0.9,blue:0.83,alpha:1)
let red = NSColor(calibratedRed:1,green:0.34,blue:0.36,alpha:1)
let paper = NSColor(calibratedRed:0.96,green:0.93,blue:0.82,alpha:1)
func typeLine(_ text:String,_ x:Int,_ y:Int,_ color:NSColor,_ size:Int=24) {
    NSAttributedString(string:text,attributes:[.font:NSFont(name:"Galmuri11",size:CGFloat(size))!, .foregroundColor:color]).draw(at:NSPoint(x:x,y:y))
}
func animate(_ t:Double) {
    let team=args[5]
    if scene == 3 {
        let slide = Int(48*pow(max(0,1-t/0.6),2))
        let x=780+slide, y=365
        NSGraphicsContext.current!.saveGraphicsState()
        NSGraphicsContext.current!.cgContext.setAlpha(min(1,t/0.55))
        box(x+6,y-6,438,180,dark)
        box(x,y,438,180,paper)
        let verse = team == "guardian" ? "내일이나 모레나" : team == "luddite" ? "향그러운 흙가슴만 남고" : "내 여기 가난한 노래의 씨를"
        let count=min(verse.count,max(0,Int((t-0.6)*4)))
        typeLine(String(verse.prefix(count)),x+26,y+70,dark,28)
        let width=Int((String(verse.prefix(count)) as NSString).size(withAttributes:[.font:NSFont(name:"Galmuri11",size:28)!]).width)
        if count < verse.count {
            for j in 0..<8 {box(x+27+width+j*3,y+68+j*3,5,6,team=="luddite" ? red:dark)}
        }
        NSGraphicsContext.current!.restoreGraphicsState()
    } else {
        let x=792, y=390
        box(x,y,416,132,dark)
        let progress=min(1,max(0,(t-0.5)/3.3))
        if team=="draw" {
            for j in 0..<2 {
                let off=t > Double(j)*1.25+1.5
                let color=off ? NSColor.gray : (j==0 ? mint:red)
                typeLine(j==0 ? "보존관":"러다이트",x+18,y+79-j*52,color)
                for k in 0..<9 where !off || k<2 {box(x+156+k*16,y+89-j*52,10,5,color)}
                if off {typeLine("차단",x+316,y+79-j*52,red)}
            }
        } else {
            let tint=team=="guardian" ? mint:red
            let done=progress>=1
            let status=team=="guardian" ? (done ? "복원 완료":"기록 복원 중") : (done ? "원본 보관 · 잠금":"외부 백업 중")
            typeLine(status,x+22,y+78,tint)
            for k in 0..<20 {box(x+22+k*18,y+33,13,16,k<Int(progress*20) ? tint:NSColor.darkGray)}
            if done && team=="luddite" {
                box(x+350,y+78,28,22,red);box(x+355,y+98,18,13,red);box(x+359,y+98,10,9,dark)
            }
        }
    }
}
let animated = scene == 3 || (scene == 1 && args[5] != "draw") || (scene == 2 && args[5] == "draw")
let frames = animated ? Int(args[8])!*12 : 1
let base = bitmap.cgImage!
for i in 0..<frames {
    autoreleasepool {
        let target = animated ? NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1280,pixelsHigh:720,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)! : bitmap
        if animated {
            let ctx = NSGraphicsContext(bitmapImageRep:target)!
            NSGraphicsContext.current = ctx
            ctx.cgContext.setShouldAntialias(false)
            ctx.cgContext.draw(base,in:frame)
            animate(Double(i)/12)
        }
        let path = animated ? args[1]+String(format:"-%03d.png",i) : args[1]
        try! target.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:path))
    }
}
