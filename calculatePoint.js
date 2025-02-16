function calculatePoints(category, quantity) {
    let points = 0;
    switch (category) {
      case "Plastic":
        points = quantity * 2;    // e.g., 2 points per KG
        break;
      case "Organic":
        points = quantity * 1;    // 1 point per KG
        break;
      case "Metal":
        points = quantity * 3;
        break;
      case "E-waste":
        points = quantity * 5;
        break;
      case "Paper":
        points = quantity * 1;
        break;
      case "Glass":
        points = quantity * 3;
        break;
      case "Textile":
        points = quantity * 3;
      case "Expired Food":
        points = quantity * 1;
        break;
      default:
        points = quantity;        // default fallback
    }
    return points;
  }
  

  module.exports = calculatePoints;