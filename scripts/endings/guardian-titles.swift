import AppKit
import CoreText
let a=CommandLine.arguments
let idx=Int(a[2])!
let film=a[7]
let warning=film=="draw" && idx==3
for url in [URL(fileURLWithPath:a[5]),FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/Galmuri11-Bold.ttf")] {
    CTFontManagerRegisterFontsForURL(url as CFURL,.process,nil)
}
let img=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1280,pixelsHigh:720,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:img)
let ctx=NSGraphicsContext.current!.cgContext
ctx.setShouldAntialias(false)
let frame=NSRect(x:0,y:0,width:1280,height:720)
ctx.clear(frame)
func words(_ text:String,_ size:Int,_ thin:Bool=false)->NSAttributedString {
    let font=NSFont(name:thin ? "Mona10x12-Regular":"Galmuri11-Bold",size:CGFloat(size))!
    return NSAttributedString(string:text,attributes:[.font:font,.foregroundColor:warning ? NSColor(calibratedRed:1,green:0.38,blue:0.37,alpha:1) : NSColor.white])
}
func centered(_ s:NSAttributedString,_ y:CGFloat) {
    precondition(s.size().width<1220)
    s.draw(at:NSPoint(x:round(640-s.size().width/2),y:y))
}
let rows=a[4].components(separatedBy:"|")
let caption = a[4]
let speaker = ["보존관", "러다이트"].first { caption.hasPrefix($0 + ":") }

func drawDrawCaption() {
    let guardian = speaker == "보존관"
    let accent = warning ? NSColor(srgbRed:1, green:0.43, blue:0.38, alpha:1)
        : guardian ? NSColor(srgbRed:0.94, green:0.83, blue:0.69, alpha:1)
        : NSColor(srgbRed:1, green:0.37, blue:0.40, alpha:1)
    let ink = guardian ? NSColor(srgbRed:0.07, green:0.11, blue:0.19, alpha:0.96)
        : NSColor(srgbRed:0.10, green:0.065, blue:0.085, alpha:0.96)
    func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ color:NSColor) {
        color.setFill()
        NSRect(x:x,y:y,width:w,height:h).fill()
    }
    var body = caption
    if let speaker = speaker {
        body = String(body.dropFirst(speaker.count + 1)).trimmingCharacters(in:.whitespaces)
    } else if body.hasPrefix("\"[SYSTEM]\"") {
        body = String(body.dropFirst(10)).trimmingCharacters(in:.whitespaces)
    }
    var lines = [""]
    for token in body.split(separator:" ") {
        let i = lines.count - 1
        let next = lines[i].isEmpty ? String(token) : lines[i] + " " + token
        if !lines[i].isEmpty && words(next,32).size().width > 1080 {
            lines.append(String(token))
        } else { lines[i] = next }
    }
    let width:CGFloat = warning ? 1168 : min(1168,max(672,(lines.map { words($0,32).size().width }.max() ?? 0)+64))
    let x:CGFloat = warning || guardian ? 56 : 1224-width
    let y:CGFloat = 36
    let height = CGFloat(lines.count)*44+65
    let top = y+height
    rect(x+4,y-4,width,height,NSColor.black.withAlphaComponent(0.46))
    rect(x,y,width,height,ink)
    rect(x,top-2,width,2,accent)
    rect(x,y, width,1,accent.withAlphaComponent(0.65))
    rect(guardian || warning ? x : x+width-5,y,5,height,accent)
    if guardian {
        rect(x+9,y+6,width-18,1,accent.withAlphaComponent(0.45))
    } else {
        for i in 0..<3 {
            let tick = x+width-28-CGFloat(i*10)
            for j in 0..<4 { rect(tick+CGFloat(j*2),top-18+CGFloat(j*2),5,2,accent) }
        }
    }
    let label = warning ? "HUMAN  /  WARNING" : speaker!
    if warning {
        rect(x+22,top-34,23,24,accent)
        rect(x+32,top-25,3,11,ink)
        rect(x+32,top-31,3,3,ink)
    } else {
        let logo = guardian ? "guardian-logo" : "luddite-logo"
        if let image = NSImage(contentsOfFile:"assets/concept/logos/"+logo+".png") {
            let w = 37 * image.size.width / image.size.height
            image.draw(in:NSRect(x:x+38-w/2,y:top-41,width:w,height:37))
        }
    }
    let name = NSMutableAttributedString(attributedString:words(label,24))
    name.addAttribute(.foregroundColor,value:accent,range:NSRange(location:0,length:name.length))
    name.draw(at:NSPoint(x:x+62,y:top-39))
    if !a[3].isEmpty && !(warning && a[3]=="HUMAN") {
        let context = warning ? a[3].components(separatedBy:"/").last!.trimmingCharacters(in:.whitespaces) : a[3]
        words(context,20,true).draw(at:NSPoint(x:x+82+name.size().width,y:top-36))
    }
    for (i,line) in lines.enumerated() {
        words(line,32).draw(at:NSPoint(x:x+25,y:top-91-CGFloat(i*44)))
    }
}
if idx==0 {
    (film=="luddite" ? NSColor(calibratedRed:0.10,green:0.035,blue:0.045,alpha:1) : NSColor(calibratedRed:0.06,green:0.09,blue:0.16,alpha:1)).setFill();frame.fill()
    ctx.setShouldAntialias(true)
    let gold=film=="luddite" ? NSColor(calibratedRed:1,green:0.38,blue:0.36,alpha:1) : NSColor(calibratedRed:0.91,green:0.80,blue:0.68,alpha:1)
    for inset in [42,50] {
        ctx.setStrokeColor(gold.withAlphaComponent(inset==42 ? 0.6 : 0.26).cgColor)
        ctx.setLineWidth(inset==42 ? 2 : 1)
        ctx.stroke(frame.insetBy(dx:CGFloat(inset),dy:CGFloat(inset)))
    }
    for x in [400,880] {
        gold.withAlphaComponent(0.65).setFill()
        NSRect(x:x-82,y:443,width:164,height:1).fill()
        ctx.saveGState()
        ctx.translateBy(x:CGFloat(x),y:444)
        ctx.rotate(by:.pi/4)
        NSRect(x:-5,y:-5,width:10,height:10).fill()
        ctx.restoreGState()
    }
    let emblem=NSImage(contentsOfFile:a[6])!
    let width=160*emblem.size.width/emblem.size.height
    emblem.draw(in:NSRect(x:640-width/2,y:364,width:width,height:160))
    let url=URL(fileURLWithPath:"assets/endings/fonts/Diphylleia-Regular.woff2")
    let descriptors=CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as! [CTFontDescriptor]
    let font=CTFontCreateWithFontDescriptor(descriptors[0],78,nil)
    centered(NSAttributedString(string:a[3],attributes:[.font:font,.foregroundColor:gold,.kern:2]),225)
} else if idx==1 {
    NSColor.black.withAlphaComponent(0.63).setFill();frame.fill()

    for (i,row) in rows.enumerated(){centered(words(row,36,true),360+CGFloat(rows.count-1)*26-CGFloat(i*53)-20)}
} else if idx==8 {
    NSColor.black.setFill();frame.fill()
    let title=words(a[3],72)
    centered(title,360-title.size().height/2)
} else if idx==7 {
    NSColor.black.setFill();frame.fill()
    let lines=rows.map{words($0,48)}
    let height=lines.reduce(CGFloat(0)){$0+$1.size().height}+12
    var top=360+height/2
    for line in lines {top-=line.size().height;centered(line,round(top));top-=12}
} else if film=="draw" && (warning || speaker != nil) {
    drawDrawCaption()
} else if idx != 6 {
    NSGradient(colors:[NSColor.black.withAlphaComponent(0.93),.clear])!.draw(in:NSRect(x:0,y:0,width:1280,height:310),angle:90)
    var wrapped:[String]=[]
    for row in rows {
        var current=""
        for word in row.split(separator:" ") {
            let candidate=current.isEmpty ? String(word) : current+" "+word
            if !current.isEmpty && words(candidate,36).size().width>1152 {
                wrapped.append(current)
                current=String(word)
            } else { current=candidate }
        }
        wrapped.append(current)
    }
    let top=45+(wrapped.count-1)*48
    let heading = warning ? (a[3].isEmpty ? "WARNING" : "WARNING   "+a[3]) : a[3]
    if !heading.isEmpty {centered(words(heading,26,true),CGFloat(top+58))}
    for (i,row) in wrapped.enumerated() {
        let text=words(row,36)
        if (2...4).contains(idx) {
            centered(text,CGFloat(top-i*48))
        } else {
            text.draw(at:NSPoint(x:64,y:top-i*48))
        }
    }
}
try img.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:a[1]))
