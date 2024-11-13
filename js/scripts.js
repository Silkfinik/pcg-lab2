$(document).ready(function () {
  var table = $("#imagesTable").DataTable({
    language: {
      url: "//cdn.datatables.net/plug-ins/1.13.4/i18n/ru.json",
    },
    columns: [
      { data: "file_name" },
      { data: "size" },
      { data: "dpi" },
      { data: "color_depth" },
      { data: "compression" },
    ],
    pageLength: 25,
    lengthMenu: [
      [25, 50, 100, -1],
      [25, 50, 100, "Все"],
    ],
  });

  $("#folderInput").on("change", function (event) {
    var files = event.target.files;
    if (files.length === 0) {
      alert("Папка не выбрана или не содержит файлов.");
      return;
    }

    $("#loader").show();

    table.clear().draw();

    $("#progressBar").css("width", "0%").attr("aria-valuenow", 0).text("0%");

    var maxFiles = 100000;
    var fileCount = Math.min(files.length, maxFiles);
    if (files.length > maxFiles) {
      alert(
        `Обнаружено ${files.length} файлов. Будут обработаны только первые ${maxFiles}.`
      );
    }

    var supportedExtensions = [
      ".jpg",
      ".jpeg",
      ".gif",
      ".tif",
      ".tiff",
      ".bmp",
      ".png",
      ".pcx",
    ];
    var supportedFiles = [];
    for (var i = 0; i < fileCount; i++) {
      var file = files[i];
      var fileName = file.name.toLowerCase();
      if (supportedExtensions.some((ext) => fileName.endsWith(ext))) {
        supportedFiles.push(file);
      }
    }

    if (supportedFiles.length === 0) {
      $("#loader").hide();
      alert("В выбранной папке нет поддерживаемых изображений.");
      return;
    }

    function processFile(file) {
      return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function (e) {
          var arrayBuffer = e.target.result;
          EXIF.getData(file, function () {
            var dpiX = EXIF.getTag(this, "XResolution") || 72;
            var dpiY = EXIF.getTag(this, "YResolution") || 72;
            var dpi = `${dpiX}x${dpiY}`;

            var colorDepth;
            switch (file.type) {
              case "image/jpeg":
                colorDepth = 24;
                break;
              case "image/png":
                colorDepth = 24;
                break;
              case "image/gif":
                colorDepth = 8;
                break;
              case "image/bmp":
                colorDepth = 24;
                break;
              case "image/tiff":
                colorDepth = 24;
                break;
              case "image/pcx":
                colorDepth = 24;
                break;
              default:
                colorDepth = "N/A";
            }

            var img = new Image();
            img.onload = function () {
              var width = img.width;
              var height = img.height;

              var compression = "N/A";
              if (file.type === "image/jpeg") {
                compression = "JPEG";
              } else if (file.type === "image/png") {
                compression = "PNG";
              } else if (file.type === "image/gif") {
                compression = "GIF";
              } else if (file.type === "image/bmp") {
                compression = "BMP";
              } else if (file.type === "image/tiff") {
                compression = "TIFF";
              } else if (file.type === "image/pcx") {
                compression = "PCX";
              }

              resolve({
                file_name: file.name,
                size: `${width} x ${height}`,
                dpi: dpi,
                color_depth: colorDepth,
                compression: compression,
              });
            };
            img.onerror = function () {
              resolve({
                file_name: file.name,
                size: "Ошибка загрузки",
                dpi: "N/A",
                color_depth: "N/A",
                compression: "N/A",
              });
            };
            img.src = URL.createObjectURL(file);
          });
        };
        reader.onerror = function () {
          resolve({
            file_name: file.name,
            size: "Ошибка чтения",
            dpi: "N/A",
            color_depth: "N/A",
            compression: "N/A",
          });
        };
        reader.readAsArrayBuffer(file);
      });
    }

    async function processFiles(files) {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let data = await processFile(file);
        table.row.add(data).draw(false);
        URL.revokeObjectURL(file);

        let progress = Math.round(((i + 1) / files.length) * 100);
        $("#progressBar")
          .css("width", progress + "%")
          .attr("aria-valuenow", progress)
          .text(progress + "%");
      }
    }

    processFiles(supportedFiles)
      .then(() => {
        $("#loader").hide();
      })
      .catch((error) => {
        $("#loader").hide();
        console.error(error);
        alert("Произошла ошибка при обработке файлов.");
      });
  });

  function exportTableToCSV(filename) {
    var csv = [];
    var rows = $("#imagesTable tr");

    for (var i = 0; i < rows.length; i++) {
      var row = [],
        cols = $(rows[i]).find("th, td");

      for (var j = 0; j < cols.length; j++) {
        var data = $(cols[j]).text().replace(/"/g, '""');
        row.push('"' + data + '"');
      }

      csv.push(row.join(","));
    }

    var csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    var downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
  }

  $("#exportButton").on("click", function () {
    exportTableToCSV("image_metadata.csv");
  });
});
