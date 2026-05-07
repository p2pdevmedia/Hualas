import UIKit

extension UIImage {
  func hualasJPEGData(
    maxDimension: CGFloat = 1280,
    compressionQuality: CGFloat = 0.85
  ) -> Data? {
    let longestSide = max(size.width, size.height)
    let scale = min(maxDimension / max(longestSide, 1), 1)
    let targetSize = CGSize(
      width: max(size.width * scale, 1),
      height: max(size.height * scale, 1)
    )

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
    let renderedImage = renderer.image { _ in
      draw(in: CGRect(origin: .zero, size: targetSize))
    }

    return renderedImage.jpegData(compressionQuality: compressionQuality)
  }
}
