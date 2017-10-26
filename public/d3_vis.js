/**
 * Created by winni on 10/25/17.
 */

d3.json("graph.json", function (graph) {
    var svg = d3.select('svg');

    var rect_width = 300;
    var rect_height = 30;
    var node = svg.selectAll('.node')
        .data([graph.nodes[0]])
        .style('fill', 'blue');

    node.exit().remove();

    node = node.enter()
        .append("g")
        .attr('id', 0)
        .attr('class', 'node')
        .attr('transform', 'translate(100,100)');

    // node.append('rect')
    //     .style("fill", "green")
    //     .merge(node)
    //     .style("stroke", "black")
    //     .attr('width', rect_width)
    //     .attr('height', rect_height)
    //     .attr('opacity', 0.3)
    // node.append('g').attr('id', 0)


    var chart = bb.generate({
        bindto: document.getElementById('0'),
        data: {
            type: "step",
            columns: [
                ["1", 30, 200, 100, 170],
                ["2", 130, 100, 140, 35]
            ],
        },
        axis: {
            x: {
                type: 'category',
                tick: {
                    outer: false,
                    centered: true
                },
                categories: ["A", "C", "G", "T"],
            },
            y: {show: false},
        },
        legend: {show: false}

    }).resize({width: 300, height: 100});

});

//



