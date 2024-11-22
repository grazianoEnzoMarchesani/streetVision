# streetVision

## Description

streetVision is an interactive web application that allows users to draw areas on a map and generate equidistant points along the roads within those areas. The application can automatically capture Google Street View images from multiple angles at each generated point, making it an ideal tool for urban analysis and street-level imagery collection.

## Features

- **Interactive Map Drawing**: Users can draw and edit rectangular areas on a grayscale map
- **Automatic Point Generation**: Generates equidistant points along roads within selected areas
- **Street View Integration**: 
  - Captures Google Street View images at each point
  - Configurable FOV (field of view) settings
  - Adjustable pitch angles
  - Multiple viewing angles per point
  - Customizable image sizes
- **Data Export Options**:
  - Download points as GeoJSON format
  - Batch download Street View images
  - Download all images as ZIP file with organized folder structure
- **Advanced Controls**:
  - City search functionality
  - Adjustable point distance
  - Area editing capabilities
  - Point numbering with zoom-dependent visibility
  - Custom map styling with grayscale base layer

## Technologies Used

- **HTML/CSS**: For structure and responsive styling
- **JavaScript (ES6)**: Pure JavaScript with ES6 modules
- **Leaflet**: For map visualization
- **Leaflet Draw**: For drawing and editing map shapes
- **Turf.js**: For geospatial calculations
- **JSZip**: For compressed image downloads
- **Google Street View API**: For street-level imagery

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/streetVision.git
   ```
2. Navigate to the project folder:
   ```bash
   cd streetVision
   ```
3. Since the application uses ES6 modules, you need to run it through a web server. Here are some options:

   Using Python:
   ```bash
   # Python 3
   python -m http.server 8000
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   Using Node.js (after installing `http-server` globally):
   ```bash
   npm install -g http-server
   http-server
   ```

   Using PHP:
   ```bash
   php -S localhost:8000
   ```

4. Open your browser and navigate to:
   - If using Python or PHP: `http://localhost:8000`
   - If using http-server: `http://localhost:8080`

Note: Running the application directly by opening the HTML file (`file:///`) won't work due to CORS restrictions and ES6 modules requirements.

## Configuration

Before using the Street View functionality:

1. Obtain a Google Maps API key
2. Enter your API key in the Street View Settings panel
3. Configure desired image parameters:
   - Image size (400x400, 800x800, or 2000x2000)
   - Field of view (30° to 180°)
   - Pitch angle (-90° to 90°)

## Usage

1. Use the search box to navigate to your desired city
2. Click "Draw" to create a rectangular area of interest
3. Adjust the point distance if needed
4. Points will be automatically generated along roads
5. Use the Street View controls to:
   - Preview images at each point
   - Download individual images
   - Batch download all images
   - Download as organized ZIP file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
