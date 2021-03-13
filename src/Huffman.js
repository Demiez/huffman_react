import React from 'react';
import './Huffman.css';
import Tree from 'react-d3-tree';
import 'semantic-ui-css/semantic.min.css';
import { Button, Label, Step } from 'semantic-ui-react';

let pixels = [];
let pixelsRGB = [];
class Huffman extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      treeData: [],
      codes: {},
      active: 'Image_block',
    };
  }

  jsonToArrayOfJson(inputJson) {
    // Конвертуємо JSON {a: 1, b: 2} в масив [{a: 1}, {b: 2}]
    const array = [];
    for (const k in inputJson) {
      const auxJson = {};
      auxJson['frequency'] = inputJson[k];
      auxJson['name'] = k;
      array.push(auxJson);
    }
    return array;
  }

  sortByFrequency(a, b) {
    if (a.frequency < b.frequency) {
      return -1;
    } else if (a.frequency === b.frequency) {
      return 0;
    } else {
      return 1;
    }
  }

  countRepetitions(array) {
    const count = {};
    array.forEach((e) => {
      count[e] = (count[e] || 0) + 1;
    });

    return count;
  }

  constructTree(frequencies) {
    while (frequencies.length > 1) {
      const leftNode = frequencies.shift();
      const rightNode = frequencies.shift();
      const newNode = {
        children: [leftNode, rightNode],
        name: undefined,
        frequency: leftNode.frequency + rightNode.frequency,
      };
      frequencies.unshift(newNode);
      frequencies.sort(this.sortByFrequency);
    }
    return frequencies[0];
  }

  mountEncodedImage(imagePixels) {
    let encodedImage = '';
    imagePixels.forEach((i) => {
      encodedImage += this.state.codes[i];
    });
    return encodedImage;
  }

  getCodes(tree, encodedImage, top, codes) {
    if (tree.children && tree.children.length >= 1) {
      encodedImage[top] = 0;
      this.getCodes(tree.children[0], encodedImage, top + 1, codes);
      encodedImage.pop();
    }
    if (tree.children && tree.children.length >= 2) {
      encodedImage[top] = 1;
      this.getCodes(tree.children[1], encodedImage, top + 1, codes);
      encodedImage.pop();
    }
    if (!tree.children) {
      codes[tree.name] = encodedImage.join('');
    }
    return codes;
  }

  fileDownload(encodedImage) {
    const text = new Blob(
      [JSON.stringify(this.state.treeData[0]) + '\n' + encodedImage],
      { type: 'application/octet-stream' }
    );
    const element = document.createElement('a');
    element.setAttribute('href', URL.createObjectURL(text));
    element.setAttribute('download', 'image');
    element.setAttribute('id', 'imagedownload');
    document.body.appendChild(element);
    element.click();
  }

  fileUpload(file, name) {
    const reader = new FileReader();

    const canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');

    reader.onloadend = (e) => {
      if (e.target.readyState === FileReader.DONE) {
        const content = e.target.result;

        const regex = /P6\n\d* \d*\n\d*\n([\s\S]*)/;
        const imageContent = regex.exec(content)[1];
        const height = parseInt(
          content.split('\n').slice(1, 2)[0].split(' ')[0]
        );
        const width = parseInt(
          content.split('\n').slice(1, 2)[0].split(' ')[1]
        );
        canvas.width = width;
        canvas.height = height;
        const myImageData = ctx.createImageData(height, width);

        pixels = myImageData.data;
        pixelsRGB = [];
        let j = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = imageContent.charCodeAt(j);
          pixels[i + 1] = imageContent.charCodeAt(j + 1);
          pixels[i + 2] = imageContent.charCodeAt(j + 2);
          pixels[i + 3] = 255;

          pixelsRGB.push(imageContent.charCodeAt(j));
          pixelsRGB.push(imageContent.charCodeAt(j + 1));
          pixelsRGB.push(imageContent.charCodeAt(j + 2));
          j += 3;
        }
        ctx.putImageData(myImageData, 0, 0);

        const repetitions = this.countRepetitions(pixelsRGB);
        const sortedDistribution = this.jsonToArrayOfJson(repetitions);
        sortedDistribution.sort(this.sortByFrequency);
        const treeObject = [this.constructTree(sortedDistribution)];

        const image = new Image();

        image.src = canvas.toDataURL();
        image.id = 'image';
        document.getElementById('app').appendChild(image);
        window.location.href = '#image';
        const codes = {};
        this.setState({ treeData: treeObject }, () => {
          setTimeout(() => {
            this.setState({
              codes: this.getCodes(this.state.treeData[0], [], 0, codes),
            });
          }, 7000);
        });
      }
    };
    reader.readAsBinaryString(file);
  }

  componentDidUpdate(prevState, prevProps) {
    if (
      prevProps.active !== this.state.active &&
      prevProps.active === 'Image_block'
    ) {
      const dimensions = this.treeContainer.getBoundingClientRect();
      this.setState({
        translate: {
          x: dimensions.width / 2,
          y: dimensions.height / 2,
        },
      });
    }
  }

  handleClick = (e, { title }) => this.setState({ active: title });
  render() {
    const { active } = this.state;
    let encodedImage;
    if (Object.keys(this.state.codes).length) {
      encodedImage = this.mountEncodedImage(pixelsRGB);
    }
    return (
      <div className="Huffman">
        <Step.Group style={{ marginTop: '3%' }}>
          <Step
            active={active === 'Image_block'}
            icon="image"
            link
            onClick={this.handleClick}
            title="Блок зображення"
            description="Обране зображення для кодування"
          />
          <Step
            active={active === 'Tree'}
            disabled={this.state.treeData.length === 0 || !this.treeContainer}
            icon="tree"
            link
            onClick={this.handleClick}
            title="Tree"
            description="Показати древо"
          />
        </Step.Group>
        {this.state.active === 'Image_block' && (
          <div id="app" className="Huffman-header">
            <Label as="label" basic htmlFor="upload" style={{ margin: '10%' }}>
              <Button
                icon="upload"
                label={{
                  basic: true,
                  content: 'Оберіть зображення в форматі .ppm',
                }}
                labelPosition="right"
              />
              <input
                hidden
                id="upload"
                multiple
                onChange={(e) => this.fileUpload(e.target.files[0], 'ok')}
                type="file"
              />
            </Label>
          </div>
        )}
        {
          <div
            id="treeWrapper"
            style={{
              width: '100%',
              height: '100%',
              marginTop: '10%',
              display: this.state.active === 'Image_block' ? 'none' : 'block',
            }}
            ref={(tc) => (this.treeContainer = tc)}
          >
            {Object.keys(this.state.codes).length > 0 && (
              <div>
                <h4 style={{ color: 'black' }}>Закодоване зображення</h4>
                <p style={{ color: 'black' }}>
                  {encodedImage.slice(0, 10) +
                    '...' +
                    encodedImage.slice(
                      encodedImage.length - 10,
                      encodedImage.length
                    )}
                </p>
                <Button
                  icon="download"
                  label={{
                    basic: true,
                    content: 'Скачати закодований блок зображення',
                  }}
                  labelPosition="right"
                  onClick={() => {
                    this.fileDownload(encodedImage);
                  }}
                />
              </div>
            )}
            {this.state.treeData.length > 0 && (
              <Tree
                zoom={0}
                orientation="vertical"
                data={this.state.treeData}
                translate={this.state.translate}
                transitionDuration={0}
              />
            )}
          </div>
        }
      </div>
    );
  }
}

export default Huffman;
