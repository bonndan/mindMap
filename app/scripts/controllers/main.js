'use strict';

var module = angular.module('controller', []);

function Node (options) {
    this.depth = options.depth;
    this.name = options.name;
    this.parent = options.parent;
    this.estimation = 0;
    this.children = [];
}

Node.prototype.getEstimation = function () {
    if (!this.children)
        var children = this._children;
    else
        var children = this.children;

    if (!children ||  children.length === 0)
        return this.estimation;
    
    var sum = 0;
    for (var i=0; i < children.length; i++)
    {
        sum += children[i].getEstimation();
    }

    return sum;
}

Node.prototype.getLabel = function () {
    return this.name;
}

Node.prototype.getRadius = function() {
    return (this.getEstimation() + "").length * 10;
}

module.controller('MainCtrl', ['$scope', function ($scope) {

        $scope.root = null;
        $scope.fileName = "mindMap";

        function serializeData(source) {
            var json = {};
            json.name = source.name;
            var children = source.children || source._children;
            var childList = [];
            if (children) {
                children.forEach(function (node) {
                    childList.push(serializeData(node));
                });
                json.children = childList;
            }
            return json;
        }

        /**
         * Creates a new node.
         * 
         * @param {Node} parent
         * @returns Node
         */
        $scope.createNode = function (parent)
        {
            return new Node(
                {
                    depth: parent.depth + 1,
                    name: "New node",
                    parent: parent,
                    estimation: 0
                }
            );
        }

        $scope.new = function () {
            $scope.json = $scope.createNode();
        }

        $scope.load = function (file) {
            var reader = new FileReader();
            reader.onload = function (event) {
                var contents = event.target.result;
                //console.log(JSON.parse(contents));
                $scope.json = JSON.parse(contents);
                $scope.$apply();
            }
            reader.readAsText(file);
        }

        $scope.save = function () {
            var saveData = serializeData($scope.root);
            // window.open("data:text/json;charset=utf-8," + escape(JSON.stringify(saveData)));		   
            var MIME_TYPE = 'application/json';
            var bb = new Blob([JSON.stringify(saveData)], {type: MIME_TYPE});

            var a = document.createElement('a');
            a.download = $scope.fileName + ".json";
            a.href = window.URL.createObjectURL(bb);
            a.textContent = 'download';

            a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
            document.querySelectorAll("#downloadLinkWrap")[0].innerHTML = "";
            document.querySelectorAll("#downloadLinkWrap")[0].appendChild(a);
        }

        
    }]);

module.directive('mindMap', function () {
    return {
        link: function (scope, element) {


            var eleW = element[0].clientWidth,
                    eleH = element[0].clientHeight;

            var m = [20, 40, 20, 80],
                    w = eleW - m[1] - m[3],
                    h = eleH - m[0] - m[2],
                    i = 0,
                    root;

            var tree = d3.layout.tree().size([h, w]);
            var diagonal = d3.svg.diagonal().projection(function (d) {
                return [d.y, d.x];
            });

            var vis = d3.select(element[0]).append("svg:svg")
                    .attr("width", w + m[1] + m[3])
                    .attr("height", h + m[0] + m[2])
                    .append("svg:g")
                    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

            // Toggle children.
            function toggle(d) {

                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
            }

            function toggleAll(d) {
                if (d.children) {
                    d.children.forEach(toggleAll);
                    toggle(d);
                }
            }


            scope.$watch('json', function () {
                if (!(scope.json != null)) {
                    scope.json = new Node({
                        "name": "root"
                    });
                }
                root = scope.json;
                root.x0 = h / 2;
                root.y0 = 0;
                update(root);
                scope.root = root;
            });

            function update(source) {
                var duration = 500;
                if (!(source != null)) {
                    return;
                }

                // Compute the new tree layout.

                var nodes = tree.nodes(root).reverse();

                // Normalize for fixed-depth.			  
                var deepest = 0,
                        generationGutter = w;
                nodes.forEach(function (d) {
                    if (deepest < d.depth) {
                        deepest = d.depth;
                    }
                });
                generationGutter = Math.floor(w / (deepest + 1));
                nodes.forEach(function (d) {
                    d.y = d.depth * generationGutter;
                });

                // Update the nodes…
                var node = vis.selectAll("g.node")
                        .data(nodes, function (d) {
                            return d.id || (d.id = ++i);
                        });

                // Enter any new nodes at the parent's previous position.
                var nodeEnter = node.enter().append("svg:g")
                        .attr("class", "node")
                        .attr("transform", function (d) {
                            return "translate(" + source.y0 + "," + source.x0 + ")";
                        });

                //inject content to node
                InjectNodeContent(nodeEnter);

                // Transition nodes to their new position.
                var nodeUpdate = node.transition()
                        .duration(duration)
                        .attr("transform", function (d) {
                            return "translate(" + d.y + "," + d.x + ")";
                        });

                nodeUpdate.select("circle")
                        .attr("r", function (d) {
                            return d.getRadius();
                        })
                        .style("fill", function (d) {
                            return d._children ? "lightsteelblue" : "#fff";
                        })
                        .style("stroke", function (d) {
                            return d.children.length == 0 ? "rgb(3, 52, 116)" : "lightsteelblue";
                        });

                nodeUpdate.select("text")
                        .text(function (d) {
                            if (typeof d.getLabel === "function")
                                return d.getLabel();
                            return d.name;
                        })
                        .style("fill-opacity", 1);
                
                nodeUpdate.select("text.estimation")
                        .text(function (d) {
                            if (typeof d.getEstimation === "function")
                                return d.getEstimation();
                            return d.estimation;
                        })
                        .style("fill-opacity", 1);

                // Transition exiting nodes to the parent's new position.
                var nodeExit = node.exit().transition()
                        .duration(duration)
                        .attr("transform", function (d) {
                            return "translate(" + source.y + "," + source.x + ")";
                        })
                        .remove();

                nodeExit.select("circle")
                        .attr("r", 1e-6);

                nodeExit.select("text")
                        .style("fill-opacity", 1e-6);

                // Update the links…
                var link = vis.selectAll("path.link")
                        .data(tree.links(nodes), function (d) {
                            return d.target.id;
                        });

                // Enter any new links at the parent's previous position.
                link.enter().insert("svg:path", "g")
                        .attr("class", "link")
                        .attr("d", function (d) {
                            var o = {x: source.x0, y: source.y0};
                            return diagonal({source: o, target: o});
                        })
                        .transition()
                        .duration(duration)
                        .attr("d", diagonal);

                // Transition links to their new position.
                link.transition()
                        .duration(duration)
                        .attr("d", diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition()
                        .duration(duration)
                        .attr("d", function (d) {
                            var o = {x: source.x, y: source.y};
                            return diagonal({source: o, target: o});
                        })
                        .remove();

                // Stash the old positions for transition.
                nodes.forEach(function (d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            }


            function InjectNodeContent(nodeEnter) {
                nodeEnter.append("svg:circle")
                        .attr("r", 1e-6)
                        .style("fill", function (d) {
                            return d.children.length < 1 ? "lightsteelblue" : "#fff";
                        })
                        .classed("toggleCircle", true)
                        .on("click", function (d) {
                            toggle(d);
                            update(d);
                        });

                nodeEnter.append("svg:text")
                        .attr("x", function(d){
                            return d.getRadius() + 20;
                        })
                        .attr("dy", "3")
                        .attr("text-anchor", "start")
                        .text(function (d) {
                            return d.name;
                        })
                        .style("fill-opacity", 1e-6);
                
                nodeEnter.append("svg:text")
                        .attr("x", -3)
                        .attr("dy", 3)
                        .text(function (d) {
                            return d.getEstimation();
                        })
                        .classed("estimation", true);

                // Add btn icon
                nodeEnter.append("svg:path")
                        .attr("d", "M12 24c-6.627 0-12-5.372-12-12s5.373-12 12-12c6.628 0 12 5.372 12 12s-5.372 12-12 12zM12 3c-4.97 0-9 4.030-9 9s4.030 9 9 9c4.971 0 9-4.030 9-9s-4.029-9-9-9zM13.5 18h-3v-4.5h-4.5v-3h4.5v-4.5h3v4.5h4.5v3h-4.5v4.5z")
                        .attr("transform", function (d) {
                            var offset = (d.children || d._children) ? -70 : 0;
                            return "translate(" + offset + "," + 10 + ")";
                        })
                        .classed("function-btn add", true);

                nodeEnter.append("svg:rect")
                        .classed("function-bg add", true)
                        .attr("width", "24px")
                        .attr("height", "24px")
                        .attr("transform", function (d) {
                            var offset = (d.children || d._children) ? -70 : 0;
                            return "translate(" + offset + "," + 10 + ")";
                        })
                        .on("click", addNewNode);

                // Remove btn icon
                nodeEnter.append("svg:path")
                        .attr("d", "M3.514 20.485c-4.686-4.686-4.686-12.284 0-16.97 4.688-4.686 12.284-4.686 16.972 0 4.686 4.686 4.686 12.284 0 16.97-4.688 4.687-12.284 4.687-16.972 0zM18.365 5.636c-3.516-3.515-9.214-3.515-12.728 0-3.516 3.515-3.516 9.213 0 12.728 3.514 3.515 9.213 3.515 12.728 0 3.514-3.515 3.514-9.213 0-12.728zM8.818 17.303l-2.121-2.122 3.182-3.182-3.182-3.182 2.121-2.122 3.182 3.182 3.182-3.182 2.121 2.122-3.182 3.182 3.182 3.182-2.121 2.122-3.182-3.182-3.182 3.182z")
                        .attr("transform", function (d) {
                            var offset = (d.children || d._children) ? -40 : 30;
                            return "translate(" + offset + "," + 10 + ")";
                        })
                        .classed("function-btn remove", true);

                nodeEnter.append("svg:rect")
                        .classed("function-bg remove", true)
                        .attr("width", "24px")
                        .attr("height", "24px")
                        .attr("transform", function (d) {
                            var offset = (d.children || d._children) ? -40 : 30;
                            return "translate(" + offset + "," + 10 + ")";
                        })
                        .on("click", removeNode);

                // Edit btn
                nodeEnter.append("svg:path")
                        .attr("d", "M20.307 1.998c-0.839-0.462-3.15-1.601-4.658-1.913-1.566-0.325-3.897 5.79-4.638 5.817-1.202 0.043-0.146-4.175 0.996-5.902-1.782 1.19-4.948 2.788-5.689 4.625-1.432 3.551 2.654 9.942 0.474 10.309-0.68 0.114-2.562-4.407-3.051-5.787-1.381 2.64-0.341 5.111 0.801 8.198v0.192c-0.044 0.167-0.082 0.327-0.121 0.489h0.121v4.48c0 0.825 0.668 1.493 1.493 1.493 0.825 0 1.493-0.668 1.493-1.493v-4.527c2.787-0.314 4.098 0.6 6.007-3.020-1.165 0.482-3.491-0.987-3.009-1.68 0.97-1.396 4.935 0.079 7.462-4.211-4 1.066-4.473-0.462-4.511-1.019-0.080-1.154 3.999-0.542 5.858-2.146 1.078-0.93 2.37-3.133 0.97-3.905z")
                        .attr("transform", function (d) {
                            var offset = (d.children || d._children) ? -10 : 60;
                            return "translate(" + offset + "," + 10 + ")";
                        })
                        .classed("function-btn edit", true);

                nodeEnter.append("svg:rect")
                        .classed("function-bg edit", true)
                        .attr("width", "24px")
                        .attr("height", "24px")
                        .attr("transform", function (d) {
                            var offset = (d.children || d._children) ? -10 : 60;
                            return "translate(" + offset + "," + 10 + ")";
                        })
                        .on("click", editNode);


                /**
                 * Adds a new node to the given node.
                 * 
                 * @param {Node} d
                 * @returns {undefined}
                 */
                function addNewNode(d) {
                    var childList;
                    if (d.children) {
                        childList = d.children;
                    }
                    else if (d._children) {
                        childList = d.children = d._children;
                        d._children = null;
                    }
                    else {
                        childList = [];
                        d.children = childList;
                    }

                    var newNode = scope.createNode(d);
                    
                    childList.push(newNode);
                    editNode(newNode);
                    
                    update(d);
                    scope.root = root;
                }
                function removeNode(d) {
                    var thisId = d.id;
                    if (!d.parent) {
                        alert("The root cannot be removed.");
                        return;
                    }
                    d.parent.children.forEach(function (c, index) {
                        if (thisId === c.id) {
                            d.parent.children.splice(index, 1);
                            return;
                        }
                    });
                    update(d.parent);
                    scope.root = root;
                }

                function editNode(d) {
                    var name = prompt("Please enter a name:", d.name);
                    if (name != null) {
                        d.name = name;
                    }

                    var estimation = prompt("Please enter an estimation:", d.estimation);
                    if (estimation != null) {
                        d.estimation = parseInt(estimation);
                    }

                    if (!d.parent) {
                        update(d);
                    }
                    update(d.parent);
                    scope.root = root;
                }
            }
        }
    }
});

module.directive('changeFile', function () {
    return {
        scope: {
            changeFunction: '=changeFile'
        },
        link: function (scope, el, attrs) {
            el.bind('change', function (event) {
                var files = event.target.files;
                var file = files[0];
                scope.changeFunction(file);
            });
        }
    };
});